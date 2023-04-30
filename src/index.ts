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
import { MO_MSG_SIZE_LIMIT } from "./constants";
import { botErr } from "./bot";

program
  .version( '0.1.2' )
  .description( 'A simple Iridium SBD vendor server application' )
  .option( '-v, --verbose', 'Verbosity level', 
    (_, prev) => prev + 1, 1 )

program.addOption(
  new Option( '--mo-tcp-port <number>', 'MO server port' )
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
    
    const locationLink = `https://maps.google.com/?q=${
        msg.location?.latitude.toFixed(7)
      },${
        msg.location?.longitude.toFixed(7)
      }&ll=${
        msg.location?.latitude.toFixed(7)
      },${
        msg.location?.longitude.toFixed(7)
      }&z=5`

    if ( msg.payload ) {

      bot.sendMessage( idChat, `MO \#${ 
        msg.header?.momsn 
      } message received from ISU \`${
        msg.header?.imei 
      }\` at the [following location](${
        locationLink
      }):\n${
        msg.payload?.payload.toString()
      }`, { parse_mode: 'Markdown' } ).catch( botErr )
      
    } else {
    
      bot.sendMessage( idChat, `Session initiated by \`${
        msg.header?.imei 
      }\` ${
        
        JSON.stringify({
          momsn: msg.header?.momsn,
          mtmsn: msg.header?.mtmsn,
          status: msg.header?.status,
        }, null, 2 )

      }\n`, { parse_mode: 'Markdown' } ).catch( botErr );

    }

  })

}

function startDecodingTask( filePath: string ): Promise<void> {

  return fs.readFile( filePath ).then( buffer => {

    const decodedMsg = GSS.Decoder.decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      const newFilePath = path.join( 
        process.env.MO_MSG_DIR!, `${
          decodedMsg.header?.imei
        }_${
          decodedMsg.header?.momsn
            .toString().padStart( 5, '0' )
        }.sbd` )
      
      fs.rename( filePath, newFilePath );

      log.success( `File ${
        colors.yellow( filePath )
      } successfully decoded => ${ colors.green( newFilePath ) }` );

      botSendMoMessage( decodedMsg );

    } else {

      log.error( `Decode failed for ${
        colors.red( filePath )
      }, invalid binary format` );      
      
      fs.unlinkSync( filePath );

    }

  })

}

const connectionHandler: (socket: net.Socket) => void = conn => {
  
  const SOCKET_TIMEOUT = 1000;
  const fileName = `RAW_${ getIID() }.bin`;
  const filePath = path.join( process.env.MO_MSG_DIR!, fileName );
  const file = fs.createWriteStream( filePath );

  conn.setTimeout( SOCKET_TIMEOUT );  

  const destroy = () => {
    
    conn.destroy();
    conn.removeAllListeners();
    
    file.destroy();
    file.removeAllListeners();

    fs.unlink( filePath );
  }

  file.on( 'error', err => {
    log.error( `Write error ${ 
      colors.red( filePath ) 
    } => ${ err.message }` );
    destroy();
  })

  conn.on( 'error', err => {
    log.error( `Connection error => ${ err.stack }` )
    destroy();
  })

  conn.on( 'timeout', () => {
    log.error( `Connection timeout` );
    destroy();
  })

  conn.on( 'close', () => {
    
    file.close();

    startDecodingTask( filePath ).catch( err => {
      log.error( `Decode task failed => ${ err.stack }` );
    });

  })

  let dataSize = 0;

  conn.on( 'data', data => {

    dataSize += data.length;

    if ( dataSize > MO_MSG_SIZE_LIMIT ) {
      
      log.warn( `Data size limit exceded by ${
        colors.yellow( ( dataSize - MO_MSG_SIZE_LIMIT ).toString() ) 
      } bytes` );

      destroy();

    } else {
      
      file.write( data, err => {
        
        if ( err == null ) {
          log.debug( `Written ${
            colors.yellow( data.length.toString() )
          } bytes to ${ colors.yellow(filePath) }` );
        } else {
          log.error( `Data write failed => ${ err.stack }` );
        }

      })

    }

  })

}

async function main() {



  /*
  const transport = new TCPTransport({
    host: "localhost",
    port: 10800,
  })
  
  transport.sendMessage({
    header: {
      imei: "098789675437658",
      flags: 0,
      ucmid: Buffer.from([ 0x21, 0x22, 0x45, 0x56 ]),
    },
    payload: {
      payload: Buffer.from( "This is a payload" ),
    }
  }, encodeMtMessage ).then( () => {
    console.log( "OK" );
  }).catch( err => {
    console.log( "NOPE" );
  })
  */

  teleBot.setup({
    token: process.env.TELE_BOT_TOKEN,
    secret: process.env.TELE_BOT_SECRET,
  }, botErr )

  program.parse();
  const opts = program.opts();

  logger.setLevel( opts.verbose );
  
  if ( opts.moMsgDir ) {
    process.env.MO_MSG_DIR = opts.moMsgDir;
  }

  if ( opts.moTcpPort ) {
    process.env.MO_TCP_PORT = opts.moTcpPort;
  }

  if ( !checkEnv() ) {
    log.error( `Please check your environment file` );
    process.exit( 1 );
  }


  const moMsgDir = process.env.MO_MSG_DIR!;

  if ( process.env.MO_TCP_PORT === undefined ) {
    log.error( 'MO_TCP_PORT not defined' );
    process.exit(1);
  }
  
  if ( moMsgDir === undefined ) {
    log.error( 'MO_MSG_DIR not defined' );
    process.exit(1);
  }

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
    log.info( `Using data dir=${ colors.yellow( moMsgDir ) }` )
  }
  
  server.on( 'connection', connectionHandler );

  server.listen( parseInt( process.env.MO_TCP_PORT ), () => {
    log.success( `Listening on port ${ 
      colors.yellow( process.env.MO_TCP_PORT! ) 
    }` );
  })

  teleBot.getOwnerChatId( ( bot, idChat ) => {
    bot.sendMessage( idChat, 'Iridium SBD server ready' ).catch( botErr );
  })

}

main();