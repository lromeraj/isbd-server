#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../src/logger"
import { Argument, Command, Option, program } from "commander";
import { decodeMoMessage } from "isbd-emu/build/gss/msg/decoder";

program
  .version( '0.0.1' )
  .description( 'Binary data decoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'Binary file path' ).argRequired() )

async function main() {
  program.parse();

  const programArgs = program.args;

  const [ filePath ] = programArgs;

  if ( fs.pathExistsSync( filePath ) ) {
    
    logger.debug( `Reading ${colors.yellow( filePath )} ...`)

    const fileData = fs.readFileSync( filePath );
    const moMessage = decodeMoMessage( fileData );
    
    if ( moMessage ) {
      console.log( moMessage );
    } else {
      logger.error( "Decode failed, invalid binary format" );
    }
  
  } else {
    logger.error( `File ${colors.yellow( filePath )} does not exist`)
  }

}


main();