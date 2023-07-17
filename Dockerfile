FROM node:16-slim

WORKDIR /isbd-server

COPY package*.json .
COPY tsconfig.json .
COPY modules/ modules/
COPY src/ src/
COPY scripts/ scripts/

RUN npm install

CMD node build/src/index.js
