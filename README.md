# Iridium SBD Direct IP Server
This repository provides a server for testing Iridium SBD Direct IP messages. This server can be used with your official Iridium Direct IP server provider and also with the following [Iridium SBD emulator](https://glab.lromeraj.net/ucm/miot/tfm/iridium-sbd-emulator).

This server implements a tiny Telegram bot to notify you about incoming _MO_ (_Mobile Originated_) messages. See the [following instructions](https://glab.lromeraj.net/npm/tele-bot) if you don't know how to create a new Telegram bot.

# Building the server

This server depends on the `NodeJS` runtime environment (which you probably have already installed) but in case you don't, you can simply do:

> **NOTE**: the following instructions assume you are working from Ubuntu. If you need specific instructions for your OS, search in Google how to install `Node JS v14.x`.

``` bash
curl -sL https://deb.nodesource.com/setup_14.x -o nodesource_setup.sh
```

Check it's contents if you don't feel comfortable with a direct "blind" install:
``` bash
nano nodesource_setup.sh
```

Finally install it:
``` bash
sudo bash nodesource_setup.sh
```

If `node` and `npm` are accesible from your path, you are ready to build the server:
``` bash
npm i
```

A file named `.env` should have appeared in the root of the repository, here you can specify your own configuration, like your bot token, secrets ... see the [environment variables section](#environment-variables).

# Environment variables
| Variable   |      Description      |  Default |
|----------|-------------|------|
| `MO_TCP_PORT` | Port where the server will listen for incoming TCP packets | `10800` |
| `MO_MSG_DIR` | Directory where the incoming _MO_ messages will be stored. | `mo/` |
| `TELE_BOT_TOKEN` | Telegram bot access token | -- |
| `TELE_BOT_SECRET` | Telegram bot secret used during handshake | -- |

# Running the server

To execute the server in the current terminal use:
```
npm run test
```

To execute the server using a background process manager use:
``` bash
npm run start
```

To stop it:
``` bash
npm run stop
```

# Server functioning

The server will start listening on the port specified in the [environment file](#environment-variables). For each socket connection the server follows a simple logic:
  1. A file will be created with the following naming convention: sbd_<timestamp>.bin inside the specified `MO_MSG_DIR` directory.
  2. A watchdog timeout is created in order to limit the maximum time a connection can be opened in order to limit resources used.
  3. All data sent from the socket will be written to a new file with a maximum fixed limit of `1024` bytes. 
      - If this limit is exceded the connection will be destroyed and the file will be removed.
  4. If the received data is within the limits, the connection will be gracefully closed.
  5. A task will be created to analyze the file contents, if the file has a valid *Mobile Originated Message* it will be permanently stored inside the `MO_MSG_DIR`, otherwise the the file will be removed.

> **NOTE**: the server will log most relevant actions carried out. By the moment is not possible to modify the verbosity level and debug mode is used by default.

# Proxy
If you are going to expose this server to a WAN, it is recommended to use a reverse proxy in order to increase security, in this case we are using *HAProxy*, with the following configuration:

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

This simply checks if the address which requested TCP handshake is whitelisted. In this case the whitelisted IPv4 corresponds to the Iridium Direct IP server.

# Tools

This server comes with some scripts which will simplify some tasks like decoding _MO_ Messages. To execute the different scripts you can use the `sbd-env.sh` file to load server related environment:
``` bash
source sbd-env.sh
```

After this you can execute scripts by typing:
``` bash
sbd <script_name>
```

> **IMPORTANT**: those tools have been deprecated after including the ISBD emulator as submodule which includes all of this tools natively.

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

