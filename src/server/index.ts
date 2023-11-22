import net from "net";
import util from "util";
import colors from "colors";

import * as logger from "../logger";
import { SERVER_OPTIONS } from "../env";

import { checkMoMsgDir } from "./tools";
import { moSocketHandler } from "./handlers";

const log = logger.create( __filename );

const server = net.createServer();

export async function setupMoServer() {

  // check mobile originated message directory
  return checkMoMsgDir().then( () => {

    server.on( 'connection', moSocketHandler );

    server.maxConnections = SERVER_OPTIONS.mo.tcpConn;

    log.info( `Maximum concurrent connections: ${
      colors.yellow( SERVER_OPTIONS.mo.tcpConn + '' )
    }`)

    const listen: ( 
      port: number, host: string, backlog: number 
    ) => Promise<void> 
      = util.promisify( server.listen.bind( server ) );
    
    return listen( 
      SERVER_OPTIONS.mo.tcpPort,
      SERVER_OPTIONS.mo.tcpHost,
      SERVER_OPTIONS.mo.tcpQueue,
    ).then( () => {
      log.info( `Server listening on [${
        colors.green( SERVER_OPTIONS.mo.tcpHost )
      }]:${
        colors.yellow( SERVER_OPTIONS.mo.tcpPort+'' )
      }, backlog: ${
        colors.yellow( SERVER_OPTIONS.mo.tcpQueue+'' ) 
      }` );
    })

  }) 

}