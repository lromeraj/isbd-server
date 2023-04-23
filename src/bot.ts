import * as teleBot from "tele-bot";
import TelegramBot from "node-telegram-bot-api"
import logger from "./logger";

export function botErr( err: Error ) {
  logger.error( `Bot error => ${ err.message }` );
}