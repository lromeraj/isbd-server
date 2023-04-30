import * as teleBot from "tele-bot";
import TelegramBot from "node-telegram-bot-api"
import * as logger from "./logger";

const log = logger.create( 'tele-bot' );

export function botErr( err: Error ) {
  log.error( `Bot error => ${ err.message }` );
}