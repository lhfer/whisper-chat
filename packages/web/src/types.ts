export interface ChatMessage {
  id: string
  type: 'chat' | 'system'
  text: string
  from?: string
  ts: number
  mine?: boolean
  mediaType?: 'text' | 'image'
  readBy?: number
  burning?: boolean
  burnStartedAt?: number  // timestamp when burn countdown started
}

export interface RoomInfo {
  maxMembers: number
  burnSeconds: number
  ttlSeconds: number
  createdAt: number
}
