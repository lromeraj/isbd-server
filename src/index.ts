import dotenv from "dotenv";
dotenv.config();

import os from "os";
import colors from "colors";
import net from "net";
import path from "path";
import fs from "fs-extra";
import logger from "./logger";
import * as teleBot from "tele-bot";

// import { TCPTransport } from "isbd-emu/build/gss/transport/tcp"
// import { decodeMoMessage } from "isbd-emu/build/gss/msg/decoder"
import { GSS } from "isbd-emu"
import { checkEnv } from "./env";
import { Option, program } from "commander";
import { MO_MSG_SIZE_LIMIT } from "./constants";
import { botErr, getBot } from "./bot";


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
  

function botSendMoMessage( msg: GSS.Message.MO ) {
  
  teleBot.getOwnerChatId( idChat => {
        
    if ( msg.payload ) {
      
      getBot( bot => {

        bot.sendMessage( idChat, `MO \#${ 
          msg.header?.momsn 
        } message received from ISU \`${
          msg.header?.imei 
        }\`:\n${
          msg.payload?.payload.toString()
        }`, { parse_mode: 'Markdown' } ).catch( botErr );
      })     

    } else {

      getBot( bot => {
        bot.sendMessage( idChat, `Session initiated by \`${
          msg.header?.imei 
        }\` `, { parse_mode: 'Markdown' } ).catch( botErr );
      })

    }

  })
}

function startDecodingTask( filePath: string ): Promise<void> {

  return fs.readFile( filePath ).then( buffer => {

    logger.debug( `Decoding file ${ colors.yellow( filePath ) } ...` )

    const decodedMsg = GSS.Decoder.decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      logger.info( `File ${
        colors.yellow( filePath )
      } decoded` );

      botSendMoMessage( decodedMsg );

    } else {
      
      logger.error( `Decode failed for ${
        colors.yellow( filePath )
      } failed, invalid binary format` );
      
      fs.unlink( filePath ).then( () => {
        logger.warn( `File ${ 
          colors.yellow( filePath ) 
        } removed` );
      })
      
    }

  })

}

const connectionHandler: (socket: net.Socket) => void = conn => {
  
  const fileName = `sbd_${ Date.now() }.bin`;
  const filePath = path.join( process.env.MO_MSG_DIR!, fileName );
  
  logger.debug( `Creating file ${ 
    colors.yellow( filePath ) 
  } ...` );

  const file = fs.createWriteStream( filePath );
  
  conn.setTimeout( 1000 );

  const undo = () => {
    conn.removeAllListeners();
    conn.end();

    fs.unlink( filePath );
  }

  conn.on( 'error', err => {
    logger.error( `Connection error => ${ err.stack }` )
    undo();
  })

  conn.on( 'timeout', () => {
    logger.error( `Connection timeout` );
    undo();
  })

  conn.on( 'close', () => {
    file.close();
    logger.info( `Data written to ${ colors.green(filePath) }` )
    startDecodingTask( filePath );
  })

  let dataSize = 0;

  conn.on('data', data => {

    dataSize += data.length;

    if ( dataSize > MO_MSG_SIZE_LIMIT ) {
      
      logger.warn( `Data size limit exceded by ${
        colors.yellow( ( dataSize - MO_MSG_SIZE_LIMIT ).toString() ) 
      } bytes` );

      undo();

    } else {
      
      file.write( data, err => {
        
        if ( err == null ) {
          logger.debug( `Written ${
            colors.yellow( data.length.toString() )
          } bytes to ${ colors.yellow(filePath) }` );
        } else {
          logger.error( `Data write failed => ${ err.stack }` );
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
    logger.error( `Please check your environment file` );
    process.exit( 1 );
  }


  const moMsgDir = process.env.MO_MSG_DIR!;

  if ( process.env.MO_TCP_PORT === undefined ) {
    logger.error( 'MO_TCP_PORT not defined' );
    process.exit(1);
  }
  
  if ( moMsgDir === undefined ) {
    logger.error( 'MO_MSG_DIR not defined' );
    process.exit(1);
  }

  if ( !fs.pathExistsSync( moMsgDir ) ) {

    await fs.mkdir( moMsgDir, { 
      recursive: true 
    }).then( () => {
      
      logger.success( `MO message dir=${
        colors.yellow( moMsgDir )
      } created successfully` );

    }).catch( err => {
      
      logger.error( `Could not create dir=${
        colors.yellow( moMsgDir )
      } => ${err.stack}` );
      
      process.exit(1);
    })

  } else {
    logger.info( `Using data dir=${ colors.yellow( moMsgDir ) }` )
  }
  
  server.on( 'connection', connectionHandler );

  server.listen( parseInt( process.env.MO_TCP_PORT ), () => {
    logger.success( `Listening on port ${ colors.yellow( process.env.MO_TCP_PORT! ) }` );
  })

  teleBot.getOwnerChatId( idChat => {
    getBot( bot => {
      bot.sendMessage( idChat, 'Iridium SBD server ready' ).catch( botErr );
    })
  })

}

main();