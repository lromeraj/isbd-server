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
import { envIsValid } from "./env";

// import fileUpload, { UploadedFile } from "express-fileupload";
// import fileUpload from "express-fileupload";
// const fileUpload = require('express-fileupload');

const DATA_SIZE_LIMIT = 1024;

const server = net.createServer();
const bot = teleBot.setup({
  token: process.env.TELE_BOT_TOKEN!, 
  secret: process.env.TELE_BOT_SECRET!,
});


bot.on( 'polling_error', err => {
  logger.error( `Bot polling error: ${ err.message }`)
})

bot.on( 'error', err => {
  logger.error( `Bot error: ${ err.message }` );
})

// const decodeTasks: Promise<MoMessage>[] = []

function startDecodingTask( filePath: string ): Promise<void> {

  return fs.readFile( filePath ).then( buffer => {

    logger.debug( `Decoding file ${ colors.yellow( filePath ) } ...`)

    const decodedMsg = GSS.Decoder.decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      logger.success( `File ${
        colors.yellow( filePath )
      } decoded`, decodedMsg );
      
      teleBot.getOwnerChatId( idChat => {

        if ( decodedMsg.payload ) {
          
          bot.sendMessage( idChat, `MO \#${ 
            decodedMsg.header?.momsn 
          } message received from ISU \`${
            decodedMsg.header?.imei 
          }\`:\n${
            decodedMsg.payload?.payload.toString()
          }`, { parse_mode: 'Markdown' } )

        } else {
          
          bot.sendMessage( idChat, `Session initiated by \`${
            decodedMsg.header?.imei 
          }\` `, { parse_mode: 'Markdown' } )

        }
      })

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
    logger.success( `Data written to ${ colors.green(filePath) }` )
    startDecodingTask( filePath );
  })

  let dataSize = 0;

  conn.on('data', data => {

    dataSize += data.length;

    if ( dataSize > DATA_SIZE_LIMIT ) {
      
      logger.warn( `Data size limit exceded by ${
        colors.yellow( ( dataSize - DATA_SIZE_LIMIT ).toString() ) 
      } bytes` );

      undo();

    } else {
      
      file.write( data, err => {
        
        if ( err == null ) {
          logger.debug( `Written ${
            colors.yellow( data.length.toString() )
          } bytes to ${colors.yellow(filePath)}` );
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
  if ( ! envIsValid() ) {
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
    await fs.mkdir( moMsgDir, { recursive: true }).then( () => {
      logger.success( `MO message dir=${colors.yellow( moMsgDir )} created successfully` );
    }).catch( err => {
      logger.error( `Could not create dir=${ colors.yellow( moMsgDir ) } => ${err.stack}` );
      process.exit(1);
    })

  } else {
    logger.info( `Using data dir=${colors.yellow( moMsgDir )} `)
  }
  
  server.on( 'connection', connectionHandler );

  server.listen( parseInt( process.env.MO_TCP_PORT ), () => {
    logger.info( `Listening on port ${ colors.yellow( process.env.MO_TCP_PORT! ) }` );
  })

  teleBot.getOwnerChatId( idChat => {
    bot.sendMessage( idChat, 'Iridium SBD server ready' )
  })

}

main();