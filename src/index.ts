import dotenv from "dotenv";
dotenv.config();

import os from "os";
import colors from "colors";
import net from "net";
import path from "path";
import fs from "fs-extra";
import * as logger from "./logger";
import * as teleBot from "tele-bot";

const log = logger.create( 'main' );

// import { TCPTransport } from "isbd-emu/build/gss/transport/tcp"
// import { decodeMoMessage } from "isbd-emu/build/gss/msg/decoder"
import { GSS } from "isbd-emu"
import { checkEnv } from "./env";
import { Option, program } from "commander";
import { DEFAULT_MO_TCP_PORT, DEFAULT_MO_MSG_SIZE_LIMIT, DEFAULT_MO_RAM_LIMIT, DEFAULT_MO_MSG_DIR } from "./constants";
import { botErr } from "./bot";
import stream from "stream";

program
  .version( '0.2.3' )
  .description( 'A simple Iridium SBD vendor server application' )
  .option( '-v, --verbose', 'Verbosity level', 
    (_, prev) => prev + 1, 1 )

program.addOption(
  new Option( '--mo-tcp-port <number>', 'MO server port' )
    .argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-ram-limit <number>', 'maximum RAM to be used' )
    .argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-msg-dir <string>', 'MO message directory' ) )

const server = net.createServer();

const _context = {
  iid: 0,
}

function getIID() {
  return _context.iid++; 
}

function botSendMoMessage( msg: GSS.Message.MO ) {
  
  teleBot.getOwnerChatId( ( bot, idChat ) => {
    
    let mdMessage = '';

    if ( msg.header ) {
      
      mdMessage += `- Session initiated by \`${
        msg.header?.imei 
      }\` {\n${
          '```'
        + `  cdr    : ${msg.header.cdr}\n`
        + `  momsn  : ${msg.header.momsn}\n`
        + `  mtmsn  : ${msg.header.mtmsn}\n`
        + `  status : ${msg.header.status}\n`
        + '```'
      }}\n`

    }

    if ( msg.location ) {
      
      const location = GSS.Message.getDDLocation( msg.location );
  
      const locationLink = `https://maps.google.com/?q=${
          location.latitude.toFixed(7)
        },${
          location.longitude.toFixed(7)
        }&ll=${
          location.latitude.toFixed(7)
        },${
          location.longitude.toFixed(7)
        }&z=5`

      mdMessage += `- See the ISU's [location in Google Maps](${locationLink})\n`

    }

    if ( msg.payload ) {
      mdMessage += `- Received MO payload:\n ${ 
        msg.payload?.payload.toString() 
      }\n`
    }

    bot.sendMessage( idChat, mdMessage, { 
      parse_mode: 'Markdown' 
    }).catch( botErr );

  })

}

function startDecodingTask( 
  messageKey: string, type: 'ram' | 'fs' 
): Promise<void> {

  const getRawMsg: () => Promise<Buffer> = () => {
    if ( type === 'ram' ) {
      return Promise.resolve( RAM_MESSAGES.messages[ messageKey ] );
    } else if ( type === 'fs' ) {
      return fs.readFile( messageKey );
    } else {
      return Promise.reject();
    }
  }

  return getRawMsg().then( buffer => {

    const decodedMsg = GSS.Decoder.decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      const newFilePath = path.join( 
        process.env.MO_MSG_DIR!, `${
          decodedMsg.header?.imei
        }_${
          decodedMsg.header?.momsn
            .toString().padStart( 5, '0' )
        }.sbd` )
      
      fs.rename( messageKey, newFilePath );

      log.success( `File ${
        colors.yellow( messageKey )
      } successfully decoded => ${ colors.green( newFilePath ) }` );

      botSendMoMessage( decodedMsg );

    } else {

      log.error( `Decode failed for ${
        colors.red( messageKey )
      }, invalid binary format` );

      if ( type === 'fs' ) {
        fs.unlinkSync( messageKey );
      } else if ( type === 'ram' ) {
        freeRamMessage( messageKey );
      }

    }

  })

}

const SERVER_OPTIONS: {
  mo: {
    ramLimit: number,
    tcpPort: number,
    msgDir: string,
  },
  bot: {
    token: string,
    secret: string,
  }
} = {
  mo: {
    msgDir: DEFAULT_MO_MSG_DIR,
    tcpPort: DEFAULT_MO_TCP_PORT,
    ramLimit: DEFAULT_MO_RAM_LIMIT,
  },
  bot: {
    token: '',
    secret: '',
  }
}

const RAM_MESSAGES: {
  usedSpace: number;
  messages: {[key: string]: Buffer };
} = { messages: {}, usedSpace: 0 };


const allocRamMessage = ( key: string, buffer: Buffer ) => {
  RAM_MESSAGES.messages[ key ] = buffer;
  RAM_MESSAGES.usedSpace += buffer.length;
}

const freeRamMessage = ( key: string ) => {

  RAM_MESSAGES.usedSpace = 
    RAM_MESSAGES.usedSpace - RAM_MESSAGES.messages[ key ].length;

  delete RAM_MESSAGES.messages[ key ];
}

const useRAM: (opts: {
  destroyer: () => void,
  readStream: stream.Readable,
}) => void = opts => {

  const chunks: Buffer[] = []

  opts.readStream.on( 'data', chunk => {
    chunks.push( chunk );
  })

  opts.readStream.on( 'close', () => {
    const messageKey = `RAM_${getIID()}`

    allocRamMessage( messageKey, Buffer.concat( chunks ) );
    startDecodingTask( messageKey, 'ram' );
  })

}

const useFS: (opts: {
  destroyer: () => void,
  readStream: stream.Readable,
}) => void = opts => {

  const fileName = `FS_${ getIID() }.bin`;
  const filePath = path.join( process.env.MO_MSG_DIR!, fileName );
  const writeStream = fs.createWriteStream( filePath );

  const destroy = () => {
    
    writeStream.destroy();
    writeStream.removeAllListeners();

    fs.unlink( filePath );

    opts.destroyer();
  }

  writeStream.on( 'error', err => {
    log.error( `Write error ${ 
      colors.red( filePath ) 
    } => ${ err.message }` );
    destroy();
  })

  opts.readStream.on( 'close', () => {
    
    writeStream.close( err => {
      
      if ( err ) {
        log.error( `Could not close stream for ${
          colors.red( filePath )
        } => ${ err.message }` );
      } else {
        startDecodingTask( filePath, 'fs' ).catch( err => {
          log.error( `Decode task failed => ${ err.stack }` );
        });
      }

    })

  })

  opts.readStream.on( 'data', data => {

    writeStream.write( data, err => {
        
      if ( err == null ) {
        log.debug( `Written ${
          colors.yellow( data.length.toString() )
        } bytes to ${ colors.yellow( filePath ) }` );
      } else {
        log.error( `Data write failed => ${ err.stack }` );
      }

    })

  })

}

const socketHandler: (socket: net.Socket) => void = socket => {
  
  const RELATIVE_SOCKET_TIMEOUT = 1000;
  const ABSOLUTE_SOCKET_TIMEOUT = 5000;

  let absoluteTimer = setTimeout(() => {})
  
  // this stream is used to read data
  const readStream = new stream.Readable();
  
  let dataSize = 0;

  const writeStream = new stream.Writable({
    write( chunk, encoding, callback ) {
      dataSize += chunk.length;
      if ( dataSize > DEFAULT_MO_MSG_SIZE_LIMIT ) {
        callback( new Error( `MO message size limit exceded by ${ 
          dataSize - DEFAULT_MO_MSG_SIZE_LIMIT 
        }` ))
      } else {
        readStream.push( chunk );
        callback();
      }
    },
  }).on( 'close', () => {
    readStream.push( null );
  })

  const destroy = () => {
    socket.destroy();
    socket.removeAllListeners();    
  }

  if ( RAM_MESSAGES.usedSpace > 
      SERVER_OPTIONS.mo.ramLimit - DEFAULT_MO_MSG_SIZE_LIMIT ) {
    
    useFS({
      destroyer: destroy,
      readStream: readStream,
    });

  } else {
    
    useRAM({
      destroyer: destroy,
      readStream: readStream,
    });

  }

  const onTimeout = () => {
    log.error( `Connection timed out` );
    destroy();
  }

  absoluteTimer = setTimeout( 
    onTimeout, ABSOLUTE_SOCKET_TIMEOUT );
  
  socket.on( 'close', () => {
    clearTimeout( absoluteTimer );
  })

  socket.on( 'timeout', onTimeout );

  socket.on( 'error', err => {
    log.error( `Connection error => ${ err.stack }` )
    destroy();
  })

  socket.pipe( writeStream );

}

async function main() {

  SERVER_OPTIONS.bot.secret = 
    process.env.TELE_BOT_SECRET || '';

  SERVER_OPTIONS.bot.token = 
    process.env.TELE_BOT_TOKEN || '';
  
  SERVER_OPTIONS.mo.msgDir = 
    process.env.MO_MSG_DIR || DEFAULT_MO_MSG_DIR;
  
  SERVER_OPTIONS.mo.tcpPort = 
    parseInt( process.env.MO_MSG_DIR || '' ) || DEFAULT_MO_TCP_PORT;
  
  SERVER_OPTIONS.mo.ramLimit = 
    parseInt( process.env.MO_RAM_LIMIT || '' ) || DEFAULT_MO_RAM_LIMIT;

  program.parse();
  const opts = program.opts();

  logger.setLevel( opts.verbose );
  
  if ( opts.moMsgDir ) {
    SERVER_OPTIONS.mo.msgDir = opts.moMsgDir;
  }

  if ( opts.moTcpPort ) {
    SERVER_OPTIONS.mo.tcpPort = opts.moTcpPort;
  }

  if ( opts.moRamLimit ) {
    SERVER_OPTIONS.mo.ramLimit = opts.ramLimit;
  }
  
  const moMsgDir = SERVER_OPTIONS.mo.msgDir;

  if ( !fs.pathExistsSync( moMsgDir ) ) {

    await fs.mkdir( moMsgDir, { 
      recursive: true
    }).then( () => {
      
      log.success( `MO message dir=${
        colors.yellow( moMsgDir )
      } created successfully` );

    }).catch( err => {
      
      log.error( `Could not create dir=${
        colors.yellow( moMsgDir )
      } => ${err.stack}` );
      
      process.exit(1);
    })

  } else {

    log.info( `Using data dir=${ 
      colors.yellow( moMsgDir ) 
    }` )

  }
  
  server.on( 'connection', socketHandler );

  server.listen( SERVER_OPTIONS.mo.tcpPort, () => {
    log.success( `Listening on port ${ 
      colors.yellow( SERVER_OPTIONS.mo.tcpPort + '' ) 
    }` );
  })

  teleBot.setup({
    token: SERVER_OPTIONS.bot.token,
    secret: SERVER_OPTIONS.bot.secret,
  }, botErr );
  
  teleBot.getOwnerChatId( ( bot, idChat ) => {
    bot.sendMessage( idChat, 'Iridium SBD server ready' ).catch( botErr );
  })

}

main();