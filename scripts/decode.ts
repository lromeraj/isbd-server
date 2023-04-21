#!/usr/bin/node

import fs from "fs-extra";
import colors from "colors";
import logger from "../src/logger"
import { Argument, Command, Option, program } from "commander";
import { GSS } from "isbd-emu";

program
  .version( '0.0.1' )
  .description( 'MO message decoder for Iridium SBD' )

program.addArgument( 
  new Argument( '[file]', 'MO message file path' ).argRequired() )

async function main() {
  program.parse();

  const programArgs = program.args;

  const [ filePath ] = programArgs;

  if ( fs.pathExistsSync( filePath ) ) {
    
    logger.debug( `Reading ${colors.yellow( filePath )} ...`)

    const fileData = fs.readFileSync( filePath );
    const moMessage = GSS.Decoder.decodeMoMessage( fileData );
    
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