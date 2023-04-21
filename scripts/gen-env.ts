import fs from "fs-extra";
import path from "path";
import { DEFAULT_ENV  } from "../src/env";

async function main() {
  const envPath = path.join( __dirname, '../../.env' );
  
  if ( ! fs.existsSync( envPath ) ) {
    let envContent = '';
    for ( let key in DEFAULT_ENV ) {
      envContent += `${key}=${DEFAULT_ENV[key]}\n`
    }
    fs.writeFileSync( envPath, envContent );
  }

}

main();