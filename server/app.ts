import http from 'http'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { Server, LobbyRoom } from 'colyseus'
import { WebSocketTransport } from '@colyseus/ws-transport'
import { monitor } from '@colyseus/monitor'
import { RoomType } from '../types/Rooms'

import { workverse } from './rooms/workverse'

export interface GameServerOptions {
  /** Origins allowed to call the HTTP endpoints. Undefined means any origin. */
  allowedOrigins?: string[]
  /** Mount the Colyseus monitor at /colyseus. It exposes room contents, so it is off by default. */
  enableMonitor?: boolean
  /** Serve the built client from client/dist, for a single-container deploy. */
  serveClient?: boolean
}

/**
 * Builds the express app and the Colyseus server with every room registered.
 *
 * Kept separate from the process entry point so the integration tests exercise exactly
 * the same wiring the real server uses, rather than a copy of it that can drift.
 */
export function createGameServer(options: GameServerOptions = {}) {
  const app = express()

  app.use(cors(options.allowedOrigins ? { origin: options.allowedOrigins } : {}))
  app.use(express.json())

  // Liveness endpoint. Every container platform wants one, and pointing a health check
  // at the Colyseus monitor instead is not the same thing.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() })
  })

  if (options.enableMonitor) {
    app.use('/colyseus', monitor())
  }

  if (options.serveClient) {
    const clientDist = path.resolve(__dirname, '../../client/dist')

    app.use(express.static(clientDist))
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')))
  }

  const server = http.createServer(app)

  const gameServer = new Server({
    // Passing `server` straight to Server was deprecated in 0.14 and removed in 0.15;
    // the transport takes it instead.
    transport: new WebSocketTransport({ server }),
  })

  gameServer.define(RoomType.LOBBY, LobbyRoom)
  gameServer.define(RoomType.PUBLIC, workverse, {
    name: 'Public Lobby',
    description: 'For making friends and familiarizing yourself with the controls',
    password: null,
    autoDispose: false,
  })
  gameServer.define(RoomType.CUSTOM, workverse).enableRealtimeListing()

  return { app, server, gameServer }
}
