import dotenv from "dotenv";
dotenv.config();

import path from "path";
import fs from "fs-extra";
import cryptoRandomString from "crypto-random-string";
import net from "net";
// import fileUpload, { UploadedFile } from "express-fileupload";
// import fileUpload from "express-fileupload";
// const fileUpload = require('express-fileupload');

const server = net.createServer();

server.on('connection', conn => {

  console.log( conn.remoteAddress );
  
  const file = fs.createWriteStream(
    path.join( 'data', `sbd_${ Date.now() }.bin` ) );

  conn.on('data', data => {
    file.write( data );
  })

  conn.on('close', () => {
    file.close();
  })

})

server.listen( process.env.TCP_PORT, () => {
  console.log( `Server listening on port ${process.env.TCP_PORT}` );
})
