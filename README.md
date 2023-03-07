# Iridium SBD Direct IP Server

This is a server for testing *Iridium SBD Direct IP* messages and should not be used in production environments.

# Building the server
To build the server you need *Node JS* and *npm* (*Node Package Manager*).

Before building the server you have to create the environment file `.env` in the root directory of your server and type your desired listening port:
``` txt
TCP_PORT=45671
```

Execute the following command to start the building process:
``` bash
npm run buid
```

# Running the server

To execute the test server use:
```
npm run test
```

To execute the test server using a background process manager use:
``` bash
npm run start
```

To stop it:
``` bash
npm run stop
```

# Server functioning
The server will start listening on the port specified in the environment file. For each socket connection the server follows a simple logic:
  1. A file will be created with the following naming convention: sbd_<timestamp>.bin inside the `data/` directory.
  2. A watchdog timeout is created in order to limit the maximum time a connection can be opened in order to limit resources used.
  3. All data sent from the socket will be written to this file with a maximum fixed limit of `2048` bytes. 
       - If this limit is exceded the connection will be destroyed and the file will be removed.
  4. If the received data is within the limits, the connection will be closed.
  5. A task will be created to analyze the file contents, if the file has a valid *Mobile Originated Message* it will be permanently stored, otherwise the the file will be removed.

The server will log most relevant actions carried out.

# Proxy
It is recommended to use a reverse proxy in order to improve security, in this case we are using *HAProxy*, with the following configuration:

``` config
frontend isbd
  bind *:9000
  mode tcp
  acl white_list src 12.47.179.11
  tcp-request connection reject if !white_list
  use_backend iridium-sbd-server

backend iridium-sbd-server
  mode tcp
  timeout server 60s
  timeout connect 60s
  server isbd localhost:9001
```

# Tools
This server comes with some scripts which will simplify some tasks like decoding _Mobile Originated Messages_.
To execute the different scripts you can use the `sbd-env.sh` file to load server related environment:
``` bash
source sbd-env.sh
```

After this you can execute scripts by typing:
``` bash
sbd <script_name>
```

## SBD Mobile Originated Message decoder
When the server receives incoming *Mobile Originated Messages* from *Iridium*, it stores the binary data inside a data folder named `data`. You can use a script named `decode` in order to easily decode those binary files:
``` bash
sbd decode <file_path>
```
Here is an example of a successful decoding:
``` js
{
  protoRevision: 1,
  overallLength: 53,
  moHeader: {
    id: 1,
    length: 28,
    cdr: 3972576874,
    imei: '300534063281170',
    status: 0,
    momsn: 42,
    mtmsn: 0,
    time: 86000643
  },
  moLocation: {
    id: 3,
    length: 11,
    latitude: 40.4372,
    longitude: -3.63518,
    cepRadius: 2
  },
  moPayload: { id: 2, length: 5, payload: <Buffer 68 65 6c 6c 6f> }
}
```

