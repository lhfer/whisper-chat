import type { WebSocket } from 'ws'
import { nanoid } from 'nanoid'
import type { ClientMessage, ServerMessage } from '../types.js'
import { getRoom, addMember, removeMember } from '../room/manager.js'

function send(ws: WebSocket, msg: ServerMessage) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg))
  }
}

function broadcast(roomId: string, msg: ServerMessage, excludeSession?: string) {
  const room = getRoom(roomId)
  if (!room) return

  const data = JSON.stringify(msg)
  for (const [sid, member] of room.members) {
    if (sid !== excludeSession && member.ws.readyState === member.ws.OPEN) {
      member.ws.send(data)
    }
  }
}

function broadcastAll(roomId: string, msg: ServerMessage) {
  broadcast(roomId, msg)
}

export function handleConnection(ws: WebSocket) {
  const sessionId = nanoid(16)
  let currentRoom: string | null = null
  let currentNickname: string | null = null

  ws.on('message', (raw: import('ws').RawData) => {
    let msg: ClientMessage
    try {
      msg = JSON.parse(raw.toString())
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' })
      return
    }

    switch (msg.type) {
      case 'join': {
        const room = getRoom(msg.roomId)
        if (!room) {
          send(ws, { type: 'error', message: 'Room not found or expired' })
          return
        }

        // Leave previous room if any
        if (currentRoom) {
          removeMember(currentRoom, sessionId)
          broadcast(currentRoom, {
            type: 'left',
            roomId: currentRoom,
            nickname: currentNickname!,
            online: getRoom(currentRoom)?.members.size ?? 0,
          })
        }

        const added = addMember(msg.roomId, sessionId, { nickname: msg.nickname, ws })
        if (!added) {
          send(ws, { type: 'error', message: 'Room is full' })
          return
        }

        currentRoom = msg.roomId
        currentNickname = msg.nickname

        // Send room info to the joiner
        send(ws, {
          type: 'room_info',
          roomId: msg.roomId,
          config: room.config,
        })

        // Notify everyone (including joiner)
        const members = Array.from(room.members.values()).map(m => m.nickname)
        broadcastAll(msg.roomId, {
          type: 'joined',
          roomId: msg.roomId,
          nickname: msg.nickname,
          online: room.members.size,
          members,
        })
        break
      }

      case 'message': {
        if (!currentRoom || currentRoom !== msg.roomId) {
          send(ws, { type: 'error', message: 'Not in this room' })
          return
        }

        const room = getRoom(msg.roomId)
        if (!room) return

        // Initialize read receipts for this message
        room.readReceipts.set(msg.msgId, new Set([sessionId])) // sender has "read" it

        // Start expiry timer (message dies even if unread)
        const expiryTimer = setTimeout(() => {
          triggerBurn(msg.roomId, msg.msgId)
        }, room.config.ttlSeconds * 1000)
        expiryTimer.unref()
        room.burnTimers.set(`expire:${msg.msgId}`, expiryTimer)

        // Broadcast encrypted message to all (including sender for confirmation)
        broadcastAll(msg.roomId, {
          type: 'message',
          roomId: msg.roomId,
          payload: msg.payload,
          nonce: msg.nonce,
          msgId: msg.msgId,
          from: currentNickname!,
          ts: Date.now(),
          mediaType: msg.mediaType,
        })
        break
      }

      case 'ack': {
        if (!currentRoom || currentRoom !== msg.roomId) return

        const room = getRoom(msg.roomId)
        if (!room) return

        const readers = room.readReceipts.get(msg.msgId)
        if (!readers) return

        readers.add(sessionId)

        // Notify all about read progress (no "total" — room size is dynamic)
        broadcastAll(msg.roomId, {
          type: 'ack',
          roomId: msg.roomId,
          msgId: msg.msgId,
          readBy: readers.size,
          total: readers.size, // same as readBy — no denominator concept
        })

        // Plan C: per-reader independent burn timer
        // Each ack restarts the burn countdown from now,
        // so the LAST reader still gets the full burnSeconds.
        // Cancel previous burn timer and set a new one.
        const burnKey = `burn:${msg.msgId}`
        const existingBurn = room.burnTimers.get(burnKey)
        if (existingBurn) clearTimeout(existingBurn)

        const burnTimer = setTimeout(() => {
          triggerBurn(msg.roomId, msg.msgId)
        }, room.config.burnSeconds * 1000)
        burnTimer.unref()
        room.burnTimers.set(burnKey, burnTimer)
        break
      }

      case 'typing': {
        if (!currentRoom || currentRoom !== msg.roomId) return
        broadcast(msg.roomId, { type: 'typing', roomId: msg.roomId }, sessionId)
        break
      }

      case 'screenshot': {
        if (!currentRoom || currentRoom !== msg.roomId) return
        broadcastAll(msg.roomId, {
          type: 'screenshot',
          roomId: msg.roomId,
          by: currentNickname!,
        })
        break
      }
    }
  })

  ws.on('close', () => {
    if (currentRoom) {
      removeMember(currentRoom, sessionId)
      const room = getRoom(currentRoom)
      if (room) {
        broadcast(currentRoom, {
          type: 'left',
          roomId: currentRoom,
          nickname: currentNickname!,
          online: room.members.size,
        })
      }
    }
  })
}

function triggerBurn(roomId: string, msgId: string) {
  const room = getRoom(roomId)
  if (!room) return

  // Clear associated timers
  const burnKey = `burn:${msgId}`
  const expireKey = `expire:${msgId}`
  for (const key of [burnKey, expireKey]) {
    const timer = room.burnTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      room.burnTimers.delete(key)
    }
  }

  // Remove read receipts
  room.readReceipts.delete(msgId)

  // Tell all clients to burn this message
  broadcastAll(roomId, { type: 'burn', roomId, msgId })
}
