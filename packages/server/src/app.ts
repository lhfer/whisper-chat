import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import Fastify from 'fastify'
import fastifyWebSocket from '@fastify/websocket'
import fastifyCors from '@fastify/cors'
import fastifyStatic from '@fastify/static'
import { config } from './config.js'
import { createRoom, getRoom, getRoomStats } from './room/manager.js'
import { handleConnection } from './ws/hub.js'
import { initFeishuBot, registerBotRoutes } from './bot/events.js'
import { initAuthClient, registerAuthRoutes } from './bot/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = Fastify({ logger: true })

initFeishuBot()
initAuthClient()

await app.register(fastifyCors, {
  origin: config.nodeEnv === 'development' ? true : config.appUrl,
})

await app.register(fastifyWebSocket)

// ---- REST API ----

// Health check
app.get('/api/health', async () => {
  return { status: 'ok', ...getRoomStats() }
})

// Create a room
app.post<{
  Body: { maxMembers?: number; burnSeconds?: number; ttlSeconds?: number }
}>('/api/rooms', async (req) => {
  const roomConfig = createRoom({
    maxMembers: req.body?.maxMembers,
    burnSeconds: req.body?.burnSeconds,
    ttlSeconds: req.body?.ttlSeconds,
  })
  return { room: roomConfig }
})

// Get room info (public, no secrets)
app.get<{ Params: { roomId: string } }>('/api/rooms/:roomId', async (req, reply) => {
  const room = getRoom(req.params.roomId)
  if (!room) {
    return reply.code(404).send({ error: 'Room not found or expired' })
  }
  const { allowedMembers, ...safeConfig } = room.config
  return {
    config: safeConfig,
    online: room.members.size,
    restricted: allowedMembers !== null,
  }
})

// ---- Feishu Bot ----

registerBotRoutes(app)
registerAuthRoutes(app)

// ---- WebSocket ----

app.get('/ws', { websocket: true }, (socket) => {
  handleConnection(socket)
})

// ---- Static files (production) ----

const webDistPath = path.resolve(__dirname, '../../web/dist')
if (config.nodeEnv === 'production' && fs.existsSync(webDistPath)) {
  await app.register(fastifyStatic, {
    root: webDistPath,
    prefix: '/',
    wildcard: false,
  })

  // SPA fallback: serve index.html for all non-API/WS routes
  app.setNotFoundHandler(async (_req, reply) => {
    return reply.sendFile('index.html', webDistPath)
  })
}

// ---- Start ----

try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  console.log(`WhisperChat server running on port ${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
