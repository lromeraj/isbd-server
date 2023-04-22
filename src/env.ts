import colors from "colors";
import cryptoRandomString from "crypto-random-string";

import logger from "./logger";

export const DEFAULT_ENV: { 
  [key: string]: number | string 
} = {
  'MO_TCP_PORT': 10801,
  'MO_MSG_DIR': 'mo/',
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
      logger.error( `$ENV{ ${ colors.bold(key) } } is not defined` );
      valid = false;
    }
  }
  return valid;
}
