// TODO: consider moving logger to utils or to a new folder named log

import colors from "colors"
import winston, { Logger } from "winston";

interface CustomLogger extends Logger {
  success: Function,
}

const config:{
  [key:string] : { [key:string] : any },
} = {

  levels: {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
    debug: 4,
  },

  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'blue',
    success: 'green',
    debug: 'magenta',
  },

  levelFormat: {
    "error": `[ ${colors.red("ER")} ]`,
    "dbug": `[${colors.blue("DBUG")}]`,
    "info": `[${colors.blue("INFO")}]`,
    "warn": `[${colors.yellow("WARN")}]`,
    "success": `[ ${colors.green("OK")} ]`,
    "debug": `[${colors.blue("DBUG")}]`,
  }

};

winston.addColors( config.colors );

// meta param is ensured by splat()
/*
const myFormat = winston.format.printf(({ timestamp, level, message, meta }) => {
  return `${ config.levelFormat[ level ] } ${message} ${ meta ? JSON.stringify( meta ) : '' }`;
});
*/

const loggerFormat = winston.format.printf((info) => {
  return `${config.levelFormat[ info.level ]} ${info.message}`;
});

const logger = winston.createLogger({
  level: "debug",
  levels: config.levels,
  format: winston.format.combine(
    // winston.format.label({ label: 'immoliste' }),
    // winston.format.colorize({ message: true }),
    winston.format.colorize(),
    winston.format.timestamp(),
    winston.format.align(),
    
    winston.format.errors({ stack: true }),

    winston.format.printf( info => {
      const {
        timestamp, level, message, ...args
      } = info;
      // const ts = timestamp.slice(0, 19).replace('T', ' ');
      return `${timestamp} [${level}]: ${message} ${Object.keys(args).length ? JSON.stringify(args, null, 2) : ''}`;
    })
  ),
  transports: [
    new winston.transports.Console()
  ],
  exitOnError: false
}) as CustomLogger;

export default logger;