import colors from "colors";
import cryptoRandomString from "crypto-random-string";

import * as logger from "./logger";
import { DEFAULT_MO_MSG_DIR, DEFAULT_MO_TCP_PORT } from "./constants";

const log = logger.create( 'env' );

export const DEFAULT_ENV: { 
  [key: string]: number | string 
} = {
  'MO_TCP_PORT': DEFAULT_MO_TCP_PORT,
  'MO_MSG_DIR': DEFAULT_MO_MSG_DIR,
  'TELE_BOT_TOKEN': '',
  'TELE_BOT_SECRET': cryptoRandomString({
    length: 8,
    type: 'alphanumeric'
  }),
};

export function checkEnv(): boolean {
  let valid = true
  for ( let key in DEFAULT_ENV ) {
    if ( process.env[ key ] === undefined ) {
      log.error( `$ENV{ ${ colors.bold(key) } } is not defined` );
      valid = false;
    }
  }
  return valid;
}
