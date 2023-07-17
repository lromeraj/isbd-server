
export const SERVER_OPTIONS: {
  mo: {
    tcpConn: number,
    tcpPort: number,
    tcpQueue: number,
    tcpHost: string,
    msgDir: string,
  },
  bot: {
    token: string,
    secret: string,
  }
} = {
  mo: {
    msgDir: DEFAULT_MO_MSG_DIR,
    tcpPort: DEFAULT_MO_TCP_PORT,
    tcpQueue: DEFAULT_MO_TCP_QUEUE,
    tcpHost: DEFAULT_MO_TCP_HOST,
    tcpConn: DEFAULT_MO_TCP_CONN,
  },
  bot: {
    token: '',
    secret: '',
  }
}