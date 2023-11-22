FROM node:16-slim

WORKDIR /app

COPY package*.json .
COPY tsconfig.json .
COPY modules/ modules/
RUN npm install

COPY src/ src/
RUN npm run build

RUN rm -rf node_modules
RUN npm install --omit=dev
