import dotenv from "dotenv";
dotenv.config();

import Colors from "colors";
import net from "net";
import path from "path";
import fs from "fs-extra";
import cryptoRandomString from "crypto-random-string";

import logger from "./logger";
// import fileUpload, { UploadedFile } from "express-fileupload";
// import fileUpload from "express-fileupload";
// const fileUpload = require('express-fileupload');

const server = net.createServer();


const DATA_SIZE_LIMIT = 32; // maximum number fo bytes per connection

const connectionHandler: (socket: net.Socket) => void = conn => {

  logger.debug( `Socket connected, addr=${Colors.yellow( conn.remoteAddress! )}` );
  
  const fileName = `sbd_${ Date.now() }.bin`;
  const filePath = path.join( 'data', fileName );
  
  const file = fs.createWriteStream( filePath );
  
  logger.debug( `Creating file ${Colors.yellow( filePath )} ...` );
  
  let dataSize = 0;

  conn.on('data', data => {

    dataSize += data.length;

    if ( dataSize > DATA_SIZE_LIMIT ) {

      conn.removeAllListeners();
      conn.destroy();
      
      fs.unlink( filePath );
      
      logger.warn( `Data size limit exceded by ${
        Colors.yellow( ( dataSize - DATA_SIZE_LIMIT ).toString() ) 
      } bytes, destroying connection ...` );
    
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
    logger.debug( `Connection closed` );
    logger.success( `Data written to ${Colors.green(filePath)}`)
  })

}


async function main() {

  if ( process.env.TCP_PORT === undefined ) {
    logger.error("TCP_PORT not defined");
    process.exit(1);
  }

  server.on( 'connection', connectionHandler );

  server.listen( process.env.TCP_PORT, () => {
    logger.info( `Listening on port ${ Colors.yellow( process.env.TCP_PORT! ) }` );
  })

}

main();