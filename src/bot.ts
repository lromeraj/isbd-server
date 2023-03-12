import dotenv from "dotenv";
dotenv.config();
import TelegramBot from "node-telegram-bot-api";
import { LocalStorage } from "node-localstorage";
import logger from "./logger";

const localStorage = new LocalStorage( './scratch/' );
const bot = new TelegramBot( process.env.BOT_TOKEN!, { 
  polling: true,
});

let idOwnerChat = localStorage.getItem( 'id' );

export const sendOwnerMessage = ( msg: string, options?: TelegramBot.SendMessageOptions ) => {
  
  if ( idOwnerChat ) {
    return bot.sendMessage( idOwnerChat, msg, options ).catch( err => {
      logger.error( `Could not send message to owner => ${err.stack}` )
    })
  }

  return Promise.reject( new Error('Owner not configured') ).catch( err => {
    logger.error( `Could not send message, owner is not assigned` )
  });
}

const setOwnerId = ( idChat: number ) => {
  idOwnerChat = idChat.toString();
  localStorage.setItem( 'id', idOwnerChat );
}

const botMessageHandler = ( msg: TelegramBot.Message ) => {
  
  const splittedMessage = msg.text?.split(/\s+/) || [ 'help' ];
  const cmd = splittedMessage[0];
  const argv = splittedMessage.slice(1);
  const argc = argv.length

  if ( !idOwnerChat && cmd === '/owner' ) {

    if ( argc === 1 && argv[ 0 ] === process.env.BOT_SECRET! ) {
      setOwnerId( msg.chat.id );
      bot.sendMessage( msg.chat.id, `Owner OK @ ${ idOwnerChat }` );
    } else {
      bot.sendMessage( msg.chat.id, `Owner ERR` );
    }

  }

}

bot.on( 'message', botMessageHandler );