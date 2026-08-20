import { createGameServer } from './app'

const port = Number(process.env.PORT || 2567)

const { gameServer } = createGameServer({
  /**
   * Comma separated list of origins allowed to talk to this server, e.g.
   * "https://workverse.example.com,http://localhost:5173". Unset means allow any origin,
   * which is convenient in development and wrong in production.
   */
  allowedOrigins: process.env.CORS_ORIGINS?.split(',').map((origin) => origin.trim()),
  enableMonitor: process.env.COLYSEUS_MONITOR === 'true',
  serveClient: process.env.SERVE_CLIENT === 'true',
})

gameServer.listen(port)
console.log(`Listening on ws://localhost:${port}`)
