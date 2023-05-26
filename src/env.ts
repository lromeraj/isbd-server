import colors from "colors";
import cryptoRandomString from "crypto-random-string";

import * as logger from "./logger";
import { DEFAULT_MO_MSG_DIR, DEFAULT_MO_TCP_CONN, DEFAULT_MO_TCP_HOST, DEFAULT_MO_TCP_PORT, DEFAULT_MO_TCP_QUEUE } from "./constants";

const log = logger.create( 'env' );

export const DEFAULT_ENV: { 
  [key: string]: number | string 
} = {
  'MO_TCP_HOST': DEFAULT_MO_TCP_HOST,
  'MO_TCP_PORT': DEFAULT_MO_TCP_PORT,
  'MO_TCP_CONN': DEFAULT_MO_TCP_CONN,
  'MO_TCP_QUEUE': DEFAULT_MO_TCP_QUEUE,
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

export const SERVER_OPTIONS: {
  mo: {
    tcpConn: number,
    tcpPort: number,
    tcpQueue: number,
    tcpHost: string,
    msgDir: string,
  },
  bot: {
    token: string,
    secret: string,
  }
} = {
  mo: {
    msgDir: DEFAULT_MO_MSG_DIR,
    tcpPort: DEFAULT_MO_TCP_PORT,
    tcpQueue: DEFAULT_MO_TCP_QUEUE,
    tcpHost: DEFAULT_MO_TCP_HOST,
    tcpConn: DEFAULT_MO_TCP_CONN,
  },
  bot: {
    token: '',
    secret: '',
  }
}