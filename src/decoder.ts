import { Message } from "./msg";

/**
 * 
 * @param msg 
 * @param data 
 * @param offset 
 * @returns The number of bytes read
 */
function decodeMoHeader( msg: Message.MO, data: Buffer, offset: number ): number {

  msg.header = {
    id: data.readUint8( offset ),
    length: data.readUint16BE( offset + 1 ),
    cdr: data.readUint32BE( offset + 3 ),
    imei: data.subarray( offset + 7, offset + 22 ).toString( 'ascii' ),
    status: data.readUint8( offset + 22 ),
    momsn: data.readUInt16BE( offset + 23 ),
    mtmsn: data.readUint16BE( offset + 25 ),
    time: data.readUint32BE( offset + 28 ), 
  };

  // IE header length + IE length
  return 3 + msg.header.length;
}

function decodeMoLocation( msg: Message.MO, data: Buffer, offset: number ): number {
  
  msg.location = {
    id: data.readUint8( offset ),
    length: data.readUInt16BE( offset + 1 ),
    latitude: 0,
    longitude: 0,
    cepRadius: data.readUint32BE( offset + 10 ),
  };

  const header = data.readUint8( offset + 3 )
  const latDeg =  data.readUint8( offset + 4 )
  const latThoMin = data.readUint16BE( offset + 5 )
  const lonDeg = data.readUint8( offset + 7 )
  const lonThoMin = data.readUint16BE( offset + 8 )

  const ewi = header & 0x1 // north/south indicator
  const nsi = (header >> 1) & 0x1 // east/west indicator

  msg.location.latitude = ( nsi ? -1 : 1 ) * (latDeg + (latThoMin/60000))
  msg.location.longitude = ( ewi ? -1 : 1 ) * (lonDeg + (lonThoMin/60000))

  return 3 + msg.location.length;
}

function decodeMoPayload( msg: Message.MO, data: Buffer, offset: number ): number {
  
  const id = data.readUint8( offset ); 
  const length = data.readUInt16BE( offset + 1 );

  msg.payload = {
    id,
    length,
    payload: data.subarray( offset + 3, offset + 3 + length ),
  };

  return 3 + length;
}

/**
 * Decodes Iridium SBD MO Message
 * 
 * @param data Message data buffer
 * 
 * @returns Decoded mobile originated message, 
 * in case of failure `null` is returned
 */
export function decodeMoMessage( data: Buffer ): Message.MO | null {
  
  let offset: number = 3;

  const protoRevision = data.readUint8( 0 );
  const overallLength = data.readUint16BE( 1 );

  const msg: Message.MO = {
    protoRev: protoRevision,
    length: overallLength,
  };

  for ( let i=offset; i < data.length; ) {
    
    if ( data[i] === 0x1 ) {
      i += decodeMoHeader( msg, data, i );
    } else if ( data[i] === 0x2 ) {
      i += decodeMoPayload( msg, data, i );
    } else if ( data[i] == 0x3 ) {
      i += decodeMoLocation( msg, data, i );
    } else {
      return null;
    }

  }

  return msg;
}