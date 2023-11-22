import fs from "fs-extra";
import path from "path";
import Colors from "colors";
import { DEFAULT_ENV  } from "../env";

import * as logger from "../logger";

const log = logger.create( __filename );

async function main() {

	logger.setLevel( 'debug' );
	
	if ( process.env.ENV_DIR === undefined ) {
		log.error( `ENV_DIR is not defined` );
		process.exit( 1 );
	}
	
  const envPath = path.join( process.env.ENV_DIR!, '.env' );
  
  if ( ! fs.existsSync( envPath ) ) {

    // const maxKeyLen = Math.max( 
    //   ... Object.keys( DEFAULT_ENV ).map( key => key.length ) )
    
    let envContent = '';
    for ( let key in DEFAULT_ENV ) {
      envContent += `${ key }=${DEFAULT_ENV[key]}\n`
    }
    fs.writeFileSync( envPath, envContent, { 
      mode: fs.constants.S_IRUSR | fs.constants.S_IWUSR 
    });

    log.warn( `Default environment file created successfully at ${ 
			Colors.green( envPath )  
		}` );
  } else {
    log.debug( `Environment file already exists, so not created` )
  }

}

main();