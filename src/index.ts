import dotenv from "dotenv";
dotenv.config();

import path from "path";

import * as logger from "./logger";
import * as teleBot from "tele-bot";

import {
	SERVER_OPTIONS
} from "./env";
import { InvalidArgumentError, Option, program } from "commander";
import { 
	DEFAULT_MO_TCP_PORT, 
	DEFAULT_MO_TCP_CONN,
	DEFAULT_MO_MSG_DIR, 
	DEFAULT_MO_TCP_HOST, 
	DEFAULT_MO_TCP_QUEUE, 
	DEFAULT_DATA_DIR 
} from "./constants";

import { botErr } from "./bot";
import { setupMoServer } from "./server";

const log = logger.create( __filename );
const levelChoices = Object.entries( logger.levels ).map( ([k, v]) => v );

export const logLevelOption = new Option(
	'-l, --log-level <number>', 
	`Set logging level: ${ levelChoices.join( ', ' ) }` 
).argParser( v => {
	const level = parseInt( v );
	if ( !Object.entries( logger.levels ).map( ([k,v]) => v ).includes( level ) ) {
		throw new InvalidArgumentError( `Use one of the following: ${ 
			levelChoices.join( ', ' )
		}` );
	}
	return level;
}).default( 3 );

program
  .version( '0.2.3' )
  .description( 'A simple Iridium SBD vendor server application' )
	.addOption( logLevelOption );

program.addOption(
  new Option( '--data-dir <string>', 'Data directory' ) )

program.addOption(
  new Option( '--mo-tcp-port <number>', 'MO TCP server port' )
    .argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-tcp-host <string>', 'MO TCP server host' ) )

program.addOption(
  new Option( '--mo-tcp-conn <number>', 'MO TCP maximum concurrent connections' )
    .argParser( v => parseInt( v ) ) )

program.addOption(
  new Option( '--mo-tcp-queue <number>', 'MO TCP queue length' )
    .argParser( v => parseInt( v ) ) )

async function main() {

  // TODO: improve this
  SERVER_OPTIONS.bot.secret = 
    process.env.TELE_BOT_SECRET || '';

  SERVER_OPTIONS.bot.token = 
    process.env.TELE_BOT_TOKEN || '';
  
  SERVER_OPTIONS.dataDir = 
    process.env.DATA_DIR || DEFAULT_DATA_DIR;

  SERVER_OPTIONS.mo.tcpQueue = 
    parseInt( process.env.MO_TCP_QUEUE || DEFAULT_MO_TCP_QUEUE+'' );

  SERVER_OPTIONS.mo.tcpPort = 
    parseInt( process.env.MO_TCP_PORT || DEFAULT_MO_TCP_PORT+'' );
  
  SERVER_OPTIONS.mo.tcpHost = 
    process.env.MO_TCP_HOST || DEFAULT_MO_TCP_HOST;

  SERVER_OPTIONS.mo.tcpConn = 
    parseInt( process.env.MO_TCP_CONN || DEFAULT_MO_TCP_CONN+'' );

  program.parse();
  const opts = program.opts();

  logger.setLevel( opts.logLevel );
  
  if ( opts.dataDir ) {
    SERVER_OPTIONS.dataDir = opts.dataDir;
    SERVER_OPTIONS.mo.msgDir = path.join( opts.dataDir, DEFAULT_MO_MSG_DIR ); 
  }

  if ( opts.moTcpPort ) {
    SERVER_OPTIONS.mo.tcpPort = opts.moTcpPort;
  }

  if ( opts.moTcpHost ) {
    SERVER_OPTIONS.mo.tcpHost = opts.moTcpHost;
  }

  if ( opts.moTcpQueue ) {
    SERVER_OPTIONS.mo.tcpQueue = opts.moTcpQueue;
  }

  if ( opts.moTcpConn ) {
    SERVER_OPTIONS.mo.tcpConn = opts.moTcpConn;
  }

  setupMoServer().catch( err => {
    log.error( `Server setup failed => ${ err.message }` )
    process.exit( 1 );
  });

  teleBot.setup({
    token: SERVER_OPTIONS.bot.token,
    secret: SERVER_OPTIONS.bot.secret,
    storageDir: path.join( SERVER_OPTIONS.dataDir, 'tele-bot' ),
  }, botErr );
  
  teleBot.getOwnerChatId().then( ([ bot, idChat ]) => {
    return bot.sendMessage( idChat, 'Iridium SBD server ready' )
  }).catch( botErr );
}

main();

function gracefulShutdown() {
	log.warn( `Signal captured, terminating ...` );
	process.exit( 0 );
}

process.on( 'SIGINT', gracefulShutdown )
process.on( 'SIGTERM', gracefulShutdown );