# Iridium SBD Direct IP Server
This repository provides a server for testing Iridium SBD Direct IP messages. This server can be used with your official Iridium Direct IP server provider and also with the following [Iridium SBD emulator](https://glab.lromeraj.net/ucm/miot/tfm/iridium-sbd-emulator).

This server implements a tiny Telegram bot to notify you about incoming _MO_ (_Mobile Originated_) messages. See the [following instructions](https://glab.lromeraj.net/npm/tele-bot) to setup correctly your bot.

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
| Variable | Description | Default |
|----|----|----|
| `MO_TCP_PORT` | Port where the server will listen for incoming TCP packets | `10800` |
| `MO_MSG_DIR` | Directory where the incoming _MO_ messages will be stored. Relative to the process working directory | `mo/` |
| `TELE_BOT_TOKEN` | Telegram bot access token | -- |
| `TELE_BOT_SECRET` | Telegram bot secret used during handshake | -- |

# Running the server

After building the server, you should see a valid symlink in ht eroot of the directroy pointing to some script inside the `build/` directory, use the following command to see some command line options of the server:
```
node server.js --help
```
This should output something like:
``` txt
Usage: server [options]

A simple Iridium SBD vendor server application

Options:
  -V, --version           output the version number
  -v, --verbose           Verbosity level
  --mo-tcp-port <number>  MO server port
  --mo-msg-dir <string>   MO message directory
  -h, --help              display help for command
```

To execute the server using a background process manager use:
``` bash
npm run start
```

To stop it:
``` bash
npm run stop
```

Use the following command to see background processes:
``` bash
npx pm2 list
```

Take a look to the [following URL](https://pm2.keymetrics.io/docs/usage/process-management/) in order to see more command line options of this process manager.

> **NOTE**: environment variables are useful for demonized processes, but if you want to execute the server without a process manager and just test it, you can use the inline command options which will override the settings specified in the environment file.

# Server functioning

The server will start listening on the port specified in the [environment file](#environment-variables). For each socket connection the server follows the following logic:
  1. A file will be created with the following naming convention: `<IMEI>_<MOMSN>.sbd` inside the specified `MO_MSG_DIR` directory.
  2. A watchdog timeout is created in order to limit the maximum time a connection can be opened in order to limit resources used.
  3. All data sent from the socket will be written to a new file with a maximum fixed limit of `1024` bytes. 
      - If this limit is exceded, the connection will be destroyed and the file will be removed.
  4. If the received data is within the limits, the connection will be gracefully closed.
  5. A task will be created to analyze the file contents, if the file has a valid *Mobile Originated Message* it will be permanently stored inside the `MO_MSG_DIR`, otherwise the the file will be removed.

# Proxy
If you are going to expose this server to a WAN, it is recommended to use a reverse proxy in order to increase security, in this case we are using *HAProxy* with the following configuration:

``` config
frontend isbd
  bind *:9000
  mode tcp
  acl white_list src 12.47.179.11
  tcp-request connection reject if !white_list
  use_backend iridium-sbd-server

backend iridium-sbd-server
  mode tcp
  timeout server 5s
  timeout connect 5s
  server isbd localhost:10801
```

This checks if the address which requested TCP handshake is whitelisted. In this case the whitelisted IPv4 corresponds to the Iridium Direct IP server.

# Tools

> **IMPORTANT**: the following tools have been deprecated after including the ISBD emulator as submodule which already includes all of this tools natively.
 
This server comes with some scripts which will simplify some tasks like decoding _MO_ messages. To execute the different scripts you can use the `sbd-env.sh` file to load server related environment:
``` bash
source sbd-env.sh
```

After this you can execute scripts by typing:
``` bash
sbd <script_name>
```

## SBD MO Message decoder

When the server receives incoming _MO_ messages from Iridium, it stores the binary data inside the message folder `MO_MSG_DIR`. You can use a script named `decode` in order to easily decode those binary files:
``` bash
sbd decode <file_path>
```

Here is an example of a successful decoding:
``` js
{
  length: 52,
  rev: 1,
  header: {
    id: 1,
    length: 28,
    cdr: 0,
    imei: '527695889002193',
    status: 0,
    momsn: 4,
    mtmsn: 0,
    time: Moment<2006-01-11T04:18:27+01:00>
  },
  location: {
    id: 3,
    length: 11,
    latitude: 67.15716666666667,
    longitude: -31.029066666666665,
    cepRadius: 323
  },
  payload: { id: 2, length: 4, payload: <Buffer 4d 49 6f 54> }
}
```