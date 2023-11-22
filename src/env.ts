import colors from "colors";
import cryptoRandomString from "crypto-random-string";

import * as logger from "./logger";
import { DEFAULT_DATA_DIR, DEFAULT_MO_MSG_DIR, DEFAULT_MO_TCP_CONN, DEFAULT_MO_TCP_HOST, DEFAULT_MO_TCP_PORT, DEFAULT_MO_TCP_QUEUE } from "./constants";
import path from "path";

const log = logger.create( __filename );

export const DEFAULT_ENV: { 
  [key: string]: number | string 
} = {
  'DATA_DIR': DEFAULT_DATA_DIR,
  'MO_TCP_HOST': DEFAULT_MO_TCP_HOST,
  'MO_TCP_PORT': DEFAULT_MO_TCP_PORT,
  'MO_TCP_CONN': DEFAULT_MO_TCP_CONN,
  'MO_TCP_QUEUE': DEFAULT_MO_TCP_QUEUE,
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
  dataDir: string;
  mo: {
    tcpConn: number;
    tcpPort: number;
    tcpQueue: number;
    tcpHost: string;
    msgDir: string;
  };
  bot: {
    token: string;
    secret: string;
  };
} = {
  dataDir: DEFAULT_DATA_DIR,
  mo: {
    msgDir: path.join( DEFAULT_DATA_DIR, DEFAULT_MO_MSG_DIR ),
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