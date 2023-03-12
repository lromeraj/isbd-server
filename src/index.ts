import dotenv from "dotenv";
dotenv.config();

import Colors from "colors";
import net from "net";
import path from "path";
import fs from "fs-extra";
import cryptoRandomString from "crypto-random-string";
import logger from "./logger";
import { decodeMoMessage, MoMessage } from "./decoder";
// import fileUpload, { UploadedFile } from "express-fileupload";
// import fileUpload from "express-fileupload";
// const fileUpload = require('express-fileupload');

const DATA_SIZE_LIMIT = 2048;
const server = net.createServer();

// const decodeTasks: Promise<MoMessage>[] = []

function startDecodingTask( filePath: string ): Promise<void> {

  return fs.readFile( filePath ).then( buffer => {

    logger.debug( `Decoding file ${ Colors.yellow( filePath ) } ...`)

    const decodedMsg = decodeMoMessage( buffer );
    
    if ( decodedMsg ) {
      
      logger.success( `File ${
        Colors.yellow( filePath )
      } decoded`, decodedMsg );

    } else {
      
      logger.error( `Decode failed for ${
        Colors.yellow( filePath )
      } failed, invalid binary format` );
      
      fs.unlink( filePath ).then( () => {
        logger.warn( `File ${ 
          Colors.yellow( filePath ) 
        } removed` );
      })
      
    }

  })

}

const connectionHandler: (socket: net.Socket) => void = conn => {
  
  const fileName = `sbd_${ Date.now() }.bin`;
  const filePath = path.join( 'data', fileName );
  
  logger.debug( `Creating file ${Colors.yellow( filePath )} ...` );

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

  let dataSize = 0;
  conn.on('data', data => {

    dataSize += data.length;

    if ( dataSize > DATA_SIZE_LIMIT ) {
      
      logger.warn( `Data size limit exceded by ${
        Colors.yellow( ( dataSize - DATA_SIZE_LIMIT ).toString() ) 
      } bytes` );

      undo();
    } else {
      
      file.write( data, err => {
        
        if ( err == null ) {
          logger.debug( `Written ${
            Colors.yellow( data.length.toString() )
          } bytes to ${Colors.yellow(filePath)}` );
        } else {
          logger.error( `Data write failed => ${ err.stack }` );
        }

      })

    }

  })
  
  conn.on('close', () => {
    file.close();
    logger.success( `Data written to ${Colors.green(filePath)}`)
    startDecodingTask( filePath );
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

  const dataDir = process.env.DATA_DIR;

  if ( !fs.pathExistsSync( dataDir ) ) {

    fs.mkdir( dataDir ).then( () => {
      logger.success( `Data dir=${Colors.yellow( dataDir )} created successfully` );
    }).catch( err => {
      logger.error( `Could not create dir=${ Colors.yellow( dataDir ) } => ${err.stack}` )      
      process.exit( 1 )
    })
    
  }
  
  server.on( 'connection', connectionHandler );

  server.listen( process.env.TCP_PORT, () => {
    logger.info( `Listening on port ${ Colors.yellow( process.env.TCP_PORT! ) }` );
  })

}

main();