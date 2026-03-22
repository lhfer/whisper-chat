// ---- Room ----

export interface RoomConfig {
  id: string
  maxMembers: number
  burnSeconds: number     // 阅后即焚秒数
  ttlSeconds: number      // 房间最大存活时间
  createdAt: number       // unix ms
  allowedMembers: string[] | null  // null = open room, string[] = restricted to these open_ids
}

// ---- WebSocket Protocol ----

// Client → Server
export type ClientMessage =
  | { type: 'join'; roomId: string; nickname: string }
  | { type: 'message'; roomId: string; payload: string; nonce: string; msgId: string; mediaType?: 'text' | 'image' }
  | { type: 'ack'; roomId: string; msgId: string }
  | { type: 'typing'; roomId: string }
  | { type: 'screenshot'; roomId: string }

// Server → Client
export type ServerMessage =
  | { type: 'joined'; roomId: string; nickname: string; online: number; members: string[] }
  | { type: 'left'; roomId: string; nickname: string; online: number }
  | { type: 'message'; roomId: string; payload: string; nonce: string; msgId: string; from: string; ts: number; mediaType?: 'text' | 'image' }
  | { type: 'ack'; roomId: string; msgId: string; readBy: number; total: number }
  | { type: 'burn'; roomId: string; msgId: string }
  | { type: 'typing'; roomId: string }
  | { type: 'screenshot'; roomId: string; by: string }
  | { type: 'room_expired'; roomId: string }
  | { type: 'error'; message: string }
  | { type: 'room_info'; roomId: string; config: RoomConfig }

// ---- Internal ----

export interface RoomMember {
  nickname: string
  ws: import('ws').WebSocket
}

export interface RoomState {
  config: RoomConfig
  members: Map<string, RoomMember>  // sessionId → member
  /** msgId → set of sessionIds who have read it */
  readReceipts: Map<string, Set<string>>
  /** msgId → burn timer handle */
  burnTimers: Map<string, ReturnType<typeof setTimeout>>
}
