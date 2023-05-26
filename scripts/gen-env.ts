import fs from "fs-extra";
import path from "path";
import { DEFAULT_ENV  } from "../src/env";

import * as logger from "../src/logger";

const log = logger.create( 'scripts/env' );

async function main() {
  const envPath = path.join( __dirname, '../../.env' );
  
  if ( ! fs.existsSync( envPath ) ) {

    const maxKeyLen = Math.max( 
      ... Object.keys( DEFAULT_ENV ).map( key => key.length ) )
    
    let envContent = '';
    for ( let key in DEFAULT_ENV ) {
      envContent += `${
        key.padEnd( maxKeyLen, ' ')
      } = ${DEFAULT_ENV[key]}\n`
    }
    fs.writeFileSync( envPath, envContent, { 
      mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR 
    });

    log.success( `Default environment file created successfully` );
  } else {
    log.info( `Environment file already exists, so not created` )
  }

}

main();