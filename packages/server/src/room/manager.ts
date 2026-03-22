import { nanoid } from 'nanoid'
import type { RoomConfig, RoomState, RoomMember } from '../types.js'
import { config } from '../config.js'

/** In-memory room store — no persistence by design */
const rooms = new Map<string, RoomState>()

/** Room expiry timers */
const expiryTimers = new Map<string, ReturnType<typeof setTimeout>>()

export function createRoom(opts?: Partial<Pick<RoomConfig, 'maxMembers' | 'burnSeconds' | 'ttlSeconds' | 'allowedMembers'>>): RoomConfig {
  const id = nanoid(12)
  const roomConfig: RoomConfig = {
    id,
    maxMembers: opts?.maxMembers ?? config.roomMaxMembers,
    burnSeconds: opts?.burnSeconds ?? config.burnDefaultSeconds,
    ttlSeconds: opts?.ttlSeconds ?? config.roomDefaultTtl,
    createdAt: Date.now(),
    allowedMembers: opts?.allowedMembers ?? null,
  }

  const state: RoomState = {
    config: roomConfig,
    members: new Map(),
    readReceipts: new Map(),
    burnTimers: new Map(),
  }

  rooms.set(id, state)

  // Schedule room expiry
  const timer = setTimeout(() => {
    destroyRoom(id)
  }, roomConfig.ttlSeconds * 1000)
  timer.unref()
  expiryTimers.set(id, timer)

  return roomConfig
}

export function getRoom(roomId: string): RoomState | undefined {
  return rooms.get(roomId)
}

export function destroyRoom(roomId: string): void {
  const room = rooms.get(roomId)
  if (!room) return

  // Notify all members
  for (const [, member] of room.members) {
    try {
      member.ws.send(JSON.stringify({ type: 'room_expired', roomId }))
      member.ws.close(1000, 'room_expired')
    } catch {
      // ignore send errors on closing sockets
    }
  }

  // Clear all burn timers
  for (const timer of room.burnTimers.values()) {
    clearTimeout(timer)
  }

  // Clear expiry timer
  const expiryTimer = expiryTimers.get(roomId)
  if (expiryTimer) {
    clearTimeout(expiryTimer)
    expiryTimers.delete(roomId)
  }

  rooms.delete(roomId)
}

export function addMember(roomId: string, sessionId: string, member: RoomMember): boolean {
  const room = rooms.get(roomId)
  if (!room) return false
  if (room.members.size >= room.config.maxMembers) return false

  room.members.set(sessionId, member)
  return true
}

export function removeMember(roomId: string, sessionId: string): void {
  const room = rooms.get(roomId)
  if (!room) return

  room.members.delete(sessionId)
  // Room stays alive until TTL expires — don't destroy on empty
}

export function getRoomStats() {
  return {
    totalRooms: rooms.size,
    totalMembers: Array.from(rooms.values()).reduce((sum, r) => sum + r.members.size, 0),
  }
}
