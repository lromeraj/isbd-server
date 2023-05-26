# Iridium SBD Direct IP Server
This repository provides a server for testing Iridium SBD Direct IP messages. This server can be used with your official Iridium Direct IP server provider and also with the following [Iridium SBD emulator](https://github.com/lromeraj/isbd-emu).

This server includes a tiny Telegram bot to notify you about incoming _MO_ (_Mobile Originated_) messages. See the [following instructions](https://github.com/lromeraj/tele-bot) to setup correctly your bot.


# Cloning the repository

This repository depends on additional repositories which are included as _GIT_ submodules, so when cloning use the flag `--recursive` to avoid some additional steps:
``` bash
git clone https://github.com/lromeraj/lua-zephyr-module.git --recursive
```

If you have already cloned it without this flag, use the following command:
``` bash
git submodule update --init
```

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
| `MO_TCP_HOST` | Address where the server should accept incoming connections | `0.0.0.0` |
| `MO_TCP_PORT` | Port where the server will listen for incoming TCP packets | `10801` |
| `MO_TCP_CONN` | Maximum connections to be processed simultaneously | `64` |
| `MO_TCP_QUEUE` | Maximum size of the TCP queue | `32` |
| `MO_MSG_DIR` | Directory where the incoming _MO_ messages will be stored. Relative to the process working directory | `mo/` |
| `TELE_BOT_TOKEN` | Telegram bot access token | n/a |
| `TELE_BOT_SECRET` | Telegram bot secret used during handshake | n/a |

# Running the server

After building the server, you should see a valid symlink in the root of the directory pointing to some script inside the `build/` directory, use the following command to see some command line options of the server:
```
node server.js --help
```

This should output something like:
``` txt
Usage: server [options]

A simple Iridium SBD vendor server application

Options:
  -V, --version            output the version number
  -v, --verbose            Verbosity level
  --mo-tcp-port <number>   MO server port
  --mo-ram-limit <number>  maximum RAM to be used
  --mo-msg-dir <string>    MO message directory
  -h, --help               display help for command
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

The server will start listening on the port specified in the `MO_TCP_PORT` environment variable. For each socket connection the server follows the following logic:
  1. A file will be created with the following naming convention: `RAW_<IID>.bin` inside the specified `MO_MSG_DIR` directory.
  2. A watchdog timeout is created in order to limit the maximum time a connection can be opened in order to limit resources used.
  3. All data sent from the socket will be written to a new file with a maximum fixed limit of `1024` bytes. 
      - If this limit is exceded, the connection will be destroyed and the file will be removed.
  4. If the received data is within the limits, the connection will be gracefully closed.
  5. A task will be created to analyze the file contents, if the file has a valid _MO_ message it will be permanently stored inside the `MO_MSG_DIR` and renamed using the following naming convention: `<IMEI>_<MOMSN>.sbd`, otherwise the file will be removed.

# Reverse proxy
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

This checks if the address which requested TCP handshake is whitelisted. In this case the whitelisted IPv4 corresponds to the official Iridium SBD Direct IP server.

# Tools

> **IMPORTANT**: the tools have been removed after including the Iridium SBD emulator as a submodule which already includes all of this tools natively, please see the [official Iridium SBD emulator repository](https://github.com/lromeraj/isbd-emu).