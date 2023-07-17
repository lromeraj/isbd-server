import path from "path";
import fs from "fs-extra";
import colors from "colors";

import * as logger from "../logger";

import { GSS } from "isbd-emu"
import { botSendMoMessage } from "../bot";
import { SERVER_OPTIONS } from "../env";
import { DEFAULT_MO_MSG_DIR } from "../constants";

const log = logger.create( 'server/tools' );

const _context = {
  iid: 0,
}

export function getIID() {
  return _context.iid++; 
}

export async function checkMoMsgDir() {

  const moMsgDir = SERVER_OPTIONS.mo.msgDir;

  if ( !fs.pathExistsSync( moMsgDir ) ) {

    return fs.mkdir( moMsgDir, { 
      recursive: true
    }).then( () => {
      
      log.success( `MO message dir ${
        colors.yellow( moMsgDir )
      } created successfully` );

    }).catch( err => {
      
      log.error( `Could not create MO dir ${
        colors.yellow( moMsgDir )
      } => ${err.stack}` );
  
      process.exit(1);

    })

  } else {

    log.info( `Using MO dir ${ 
      colors.yellow( moMsgDir ) 
    }` )
  }

}

export async function startMoMsgDecodingTask(
  buffer: Buffer,
  id: number
): Promise<void> {

  const decodedMsg = GSS.Decoder.decodeMoMessage( buffer );
  
  if ( decodedMsg && decodedMsg.header ) {
    
    const newFilePath = path.join( 
      SERVER_OPTIONS.mo.msgDir, `${
        decodedMsg.header.imei
      }_${
        decodedMsg.header.momsn
          .toString().padStart( 5, '0' )
      }.sbd` )
    

    botSendMoMessage( decodedMsg );

    return fs.writeFile( newFilePath, buffer ).then( () => {
      log.success( `File ${
        colors.yellow( newFilePath )
      } successfully saved => ${ colors.green( newFilePath ) }` );
    }).catch( err => {
      log.error( `Could not save MO message file ${ 
        colors.red( newFilePath )
      } => ${ err.message }` );
    }) 

  } else {
    log.error( `Decode failed for #${ 
      colors.blue( id+'' ) 
    }, invalid binary format` );
  }

}