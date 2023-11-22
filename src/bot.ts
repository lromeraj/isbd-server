import * as teleBot from "tele-bot";
import * as logger from "./logger";
import { GSS } from "isbd-emu";

const log = logger.create( __filename );

export function botErr( err: Error ) {
  log.error( `Bot failure: ${ err.message }` );
}

export function botSendMoMessage( msg: GSS.Message.MO ) {
  
  teleBot.getOwnerChatId().then( ([ bot, idChat ]) => {
    
    let mdMessage = '';

    if ( msg.header ) {
      
      mdMessage += `- Session initiated by \`${
        msg.header?.imei 
      }\` {\n${
          '```'
        + `  cdr    : ${msg.header.cdr}\n`
        + `  momsn  : ${msg.header.momsn}\n`
        + `  mtmsn  : ${msg.header.mtmsn}\n`
        + `  status : ${msg.header.status}\n`
        + '```'
      }}\n`

    }

    if ( msg.location ) {
      
      const location = GSS.Message.getDDLocation( msg.location );
  
      const locationLink = `https://maps.google.com/?q=${
          location.latitude.toFixed(7)
        },${
          location.longitude.toFixed(7)
        }&ll=${
          location.latitude.toFixed(7)
        },${
          location.longitude.toFixed(7)
        }&z=5`

      mdMessage += `- See the ISU's [location in Google Maps](${locationLink})\n`

    }

    if ( msg.payload ) {
      mdMessage += `- Received MO payload:\n ${ 
        msg.payload?.payload.toString() 
      }\n`
    }

    return bot.sendMessage( idChat, mdMessage, { 
      parse_mode: 'Markdown' 
    });

  }).catch( botErr );

}