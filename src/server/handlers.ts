import net from "net";
import path from "path";
import colors from "colors";
import stream from "stream";
import fs from "fs-extra";

import * as logger from "../logger";
import { SERVER_OPTIONS } from "../env";
import { DEFAULT_MO_MSG_SIZE_LIMIT } from "../constants";
import { getIID, startMoMsgDecodingTask } from "./tools";
import { GSS } from "isbd-emu"

const log = logger.create( 'server/handlers' );

export function moSocketHandler(
  socket: net.Socket
): void {
  

  const idSocket = getIID();

  log.debug( `Connection opened #${
    colors.blue( idSocket+'' )
  }`)

  const RELATIVE_SOCKET_TIMEOUT = 1000;
  const ABSOLUTE_SOCKET_TIMEOUT = 5000;

  let absoluteTimer = setTimeout(() => {})
  
  // this stream is used to read data
  const readStream = new stream.Readable({
    read: () => {}
  });
  
  let dataSize = 0;

  const writeStream = new stream.Writable({

    write: ( chunk, encoding, callback ) => {
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
  }).on( 'error', ( err ) => {
    log.error( `Write stream failed => ${ err.message }` )
  })

  const destroy = () => {
    socket.destroy();
    socket.removeAllListeners();
  }

  useRAM({
    id: idSocket,
    destroyer: destroy,
    readStream: readStream,
  });

  /*
  if ( moRamGetSize() <= 
    SERVER_OPTIONS.mo.ramLimit - DEFAULT_MO_MSG_SIZE_LIMIT ) {
  } else {
    useFS({
      destroyer: destroy,
      readStream: readStream,
    });
  }
  */

  const onTimeout = () => {
    log.error( `Connection timed out` );
    destroy();
  }

  absoluteTimer = setTimeout( 
    onTimeout, ABSOLUTE_SOCKET_TIMEOUT );
  
  socket.on( 'close', () => {
    
    log.debug( `Connection closed for #${
      colors.blue( idSocket+'' )
    }` )

    clearTimeout( absoluteTimer );
  })

  socket.on( 'timeout', onTimeout );

  socket.on( 'error', err => {
    log.error( `Connection error => ${ err.stack }` )
    destroy();
  })

  socket.pipe( writeStream );
  socket.setTimeout( RELATIVE_SOCKET_TIMEOUT );

}

const useRAM: (
  opts: {
    id: number,
    destroyer: () => void,
    readStream: stream.Readable,
  }
) => void = opts => {

  const chunks: Buffer[] = []

  opts.readStream.on( 'data', chunk => {
    chunks.push( chunk );

    log.debug( `Received ${ 
      colors.yellow( chunk.length+'' )
    } bytes from #${ colors.blue( opts.id+'' ) }` )

  })

  opts.readStream.on( 'close', () => {
    startMoMsgDecodingTask( Buffer.concat( chunks ), opts.id );
  })

}


// const useFS: (opts: {
//   destroyer: () => void,
//   readStream: stream.Readable,
// }) => void = opts => {

//   const fileName = `FS_${ getIID() }.bin`;
//   const filePath = path.join( process.env.MO_MSG_DIR!, fileName );
//   const writeStream = fs.createWriteStream( filePath );

//   const destroy = () => {
    
//     writeStream.destroy();
//     writeStream.removeAllListeners();

//     fs.unlink( filePath );

//     opts.destroyer();
//   }

//   writeStream.on( 'error', err => {
//     log.error( `Write error ${ 
//       colors.red( filePath ) 
//     } => ${ err.message }` );
//     destroy();
//   })

//   opts.readStream.on( 'close', () => {
    
//     writeStream.close( err => {
      
//       if ( err ) {
//         log.error( `Could not close stream for ${
//           colors.red( filePath )
//         } => ${ err.message }` );
//       } else {
//         startMoMsgDecodingTask( filePath ).catch( err => {
//           log.error( `Decode task failed => ${ err.stack }` );
//         });
//       }

//     })

//   })

//   opts.readStream.on( 'data', data => {

//     writeStream.write( data, err => {
        
//       if ( err == null ) {
//         log.debug( `Written ${
//           colors.yellow( data.length.toString() )
//         } bytes to ${ colors.yellow( filePath ) }` );
//       } else {
//         log.error( `Data write failed => ${ err.stack }` );
//       }

//     })

//   })

// }
