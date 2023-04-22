import * as teleBot from "tele-bot";
import TelegramBot from "node-telegram-bot-api"
import logger from "./logger";

let bot: TelegramBot | null = null;

if ( process.env.TELE_BOT_SECRET 
  && process.env.TELE_BOT_TOKEN ) {
    bot = teleBot.setup({
      token: process.env.TELE_BOT_TOKEN!, 
      secret: process.env.TELE_BOT_SECRET!,
    })
}

export function botErr( err: Error ) {
  logger.error( `Bot error => ${ err.message }` );
}

export function getBot( callback: ( bot: TelegramBot ) => void ) {
  if ( bot ) {
    callback( bot );
  }
}