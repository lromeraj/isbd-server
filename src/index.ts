import dotenv from "dotenv";

dotenv.config();

import os from "os";
import colors from "colors";
import net from "net";
import path from "path";
import fs from "fs-extra";
import logger from "./logger";
import * as teleBot from "tele-bot";
import { decodeMoMessage, MoMessage } from "./decoder";

// import fileUpload, { UploadedFile } from "express-fileupload";
// import fileUpload from "express-fileupload";
// const fileUpload = require('express-fileupload');

const DATA_SIZE_LIMIT = 1024;

const server = net.createServer();
const bot = teleBot.setup({
  token: process.env.BOT_TOKEN!, 
  secret: process.env.BOT_SECRET!,
});

// const decodeTasks: Promise<MoMessage>[] = []

function startDecodingTask( filePath: string ): Promise<void> {

  return fs.readFile( filePath ).then( buffer => {

    logger.debug( `Decoding file ${ colors.yellow( filePath ) } ...`)

    const decodedMsg = decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      logger.success( `File ${
        colors.yellow( filePath )
      } decoded`, decodedMsg );
      
      teleBot.getOwnerChatId( idChat => {
        bot.sendMessage( idChat, `Message received from ${
          decodedMsg.moHeader?.imei 
        }: ${decodedMsg.moPayload?.payload.toString()}` )
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
  const filePath = path.join( process.env.DATA_DIR!, fileName );
  
  logger.debug( `Creating file ${colors.yellow( filePath )} ...` );

  const file = fs.createWriteStream( filePath );
  
  conn.setTimeout( 1000 );

  const undo = () => {
    conn.removeAllListeners();
    conn.end();

    fs.unlink( filePath );
  }

  conn.on('error', err => {
    logger.error( `Connection error => ${err.stack}` )
    undo();
  })

  conn.on( 'timeout', () => {
    logger.error( `Connection timeout` );
    undo();
  })

  conn.on('close', () => {
    file.close();
    logger.success( `Data written to ${colors.green(filePath)}`)
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
  
  if ( process.env.TCP_PORT === undefined ) {
    logger.error( "TCP_PORT not defined" );
    process.exit(1);
  }
  
  if ( process.env.DATA_DIR === undefined ) {
    logger.error( "DATA_DIR not defined" );
    process.exit(1);
  }

  const dataDir = process.env.DATA_DIR!;

  if ( !fs.pathExistsSync( dataDir ) ) {
    await fs.mkdir( dataDir, { recursive: true }).then( () => {
      logger.success( `Data dir=${colors.yellow( dataDir )} created successfully` );
    }).catch( err => {
      logger.error( `Could not create dir=${ colors.yellow( dataDir ) } => ${err.stack}` );
      process.exit(1);
    })

  } else {
    logger.info( `Using data dir=${colors.yellow( dataDir )} `)
  }
  
  server.on( 'connection', connectionHandler );

  server.listen( parseInt( process.env.TCP_PORT ), () => {
    logger.info( `Listening on port ${ colors.yellow( process.env.TCP_PORT! ) }` );
  })

  teleBot.getOwnerChatId( idChat => {
    bot.sendMessage( idChat, "Iridium SBD server ready" )
  })

}

main();