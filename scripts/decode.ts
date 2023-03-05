import fs from "fs-extra";
import colors from "colors";
import logger from "../src/logger"
import { Argument, Command, Option, program } from "commander";

program
  .version( '0.0.1' )
  .description( 'Binary data decoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'Binary file path' ).argRequired() )


interface InformationElement {
  id: number;
  length: number;
}

interface MoHeader extends InformationElement {
  
  /**
   * Each call data record (CDR) maintained in the Iridium Gateway Database is given a unique value
   * independent of all other information in order to absolutely guarantee that each CDR is able to be
   * differentiated from all others. This reference number, also called the auto ID, is included should the need for
   * such differentiation and reference arise.
   */
  cdr: number;

  imei: string;
  status: number;
  momsn: number;
  mtmsn: number;
  time: number;
}

interface MoPayload extends InformationElement {
  id: number;
  length: number;
  payload: Buffer;
}

interface MoLocation extends InformationElement {
  longitude: number;
  latitude: number;
  cepRadius: number;
}

interface MoConfirmation extends InformationElement {
  status: number;
}

interface MoMessage {
  moHeader?: MoHeader;
  moPayload?: MoPayload;
  moLocation?: MoLocation;
  moConfirmation?: MoConfirmation;
}

/**
 * 
 * @param msg 
 * @param data 
 * @param offset 
 * @returns The number of bytes read
 */
function decodeMoHeader( msg: MoMessage, data: Buffer, offset: number ): number {

  msg.moHeader = {
    id: data.readUint8( offset ),
    length: data.readUint16BE( offset + 1 ),
    cdr: data.readUint32BE( offset + 3 ),
    imei: data.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    status: data.readUint8( offset + 22 ),
    momsn: data.readUInt16BE( offset + 23 ),
    mtmsn: data.readUint16BE( offset + 25 ),
    time: data.readUint32BE( offset + 28 ), 
  };

  // offset + IE header length + IE length
  return 3 + msg.moHeader.length;
}

function decodeMoLocation( msg: MoMessage, data: Buffer, offset: number ): number {
  
  msg.moLocation = {
    id: data.readUint8( offset ),
    length: data.readUInt16BE( offset + 1 ),
    latitude: 0,
    longitude: 0,
    cepRadius: 0,
  };

  return 3 + msg.moLocation.length;
}

function decodeMoPayload( msg: MoMessage, data: Buffer, offset: number ): number {
  
  msg.moPayload = {
    id: data.readUint8( offset ),
    length: data.readUInt16BE( offset + 1 ),
    payload: Buffer.from([]),
  };

  msg.moPayload.payload = data.subarray( offset + 3, offset + 3 + msg.moPayload.length );

  return 3 + msg.moPayload.length;
}

function decodeData( data: Buffer ) {

  
  let offset: number = 3;
  const msg: MoMessage = {};
  const protoRevision = data.readUint8( 0 );
  const overallMsgLength = data.readUint16BE( 1 );

  console.log({
    protoRevision,
    overallMsgLength,
  });

  for ( let i=offset; i < data.length; ) {
    
    if ( data[i] === 0x1 ) {
      i += decodeMoHeader( msg, data, i );
    } else if ( data[i] === 0x2 ) {
      i += decodeMoPayload( msg, data, i );
    } else if ( data[i] == 0x3 ) {
      i += decodeMoLocation( msg, data, i );
    } else {
      break;
    }

  }

  console.log( msg );
  console.log( msg.moPayload?.payload.toString( 'ascii' ) )

}

async function main() {
  program.parse();

  const programArgs = program.args;

  const [ filePath ] = programArgs;

  if ( fs.pathExistsSync( filePath ) ) {
    logger.debug( `Reading ${colors.yellow( filePath )} ...`)
    const fileData = fs.readFileSync( filePath );

    decodeData( fileData );
    
  } else {
    logger.error( `File ${colors.yellow( filePath )} does not exist`)
  }

}


main();