import { useState, useCallback, useEffect, useRef } from 'react'
import { useWebSocket } from './useWebSocket.js'
import { encryptMessage, decryptMessage } from '../crypto/encrypt.js'
import { generateMsgId, getRoomKeyFromUrl } from '../crypto/keys.js'
import type { ChatMessage, RoomInfo } from '../types.js'

export function useRoom(roomId: string) {
  const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws`
  const { send, onMessage, connected } = useWebSocket(wsUrl)

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [members, setMembers] = useState<string[]>([])
  const [online, setOnline] = useState(0)
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null)
  const [typing, setTyping] = useState(false)
  const [screenshotAlert, setScreenshotAlert] = useState<string | null>(null)

  const roomKeyRef = useRef<Uint8Array | null>(null)
  const nicknameRef = useRef<string>('')
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Get room key from URL fragment
  useEffect(() => {
    roomKeyRef.current = getRoomKeyFromUrl()
  }, [])

  // Handle incoming messages
  useEffect(() => {
    return onMessage((data) => {
      switch (data.type) {
        case 'room_info':
          setRoomInfo({
            maxMembers: data.config.maxMembers,
            burnSeconds: data.config.burnSeconds,
            ttlSeconds: data.config.ttlSeconds,
            createdAt: data.config.createdAt,
          })
          break

        case 'joined':
          setOnline(data.online)
          setMembers(data.members)
          if (data.nickname !== nicknameRef.current) {
            setMessages((prev) => [
              ...prev,
              { id: generateMsgId(), type: 'system', text: `${data.nickname} 加入了聊天`, ts: Date.now() },
            ])
          }
          break

        case 'left':
          setOnline(data.online)
          setMessages((prev) => [
            ...prev,
            { id: generateMsgId(), type: 'system', text: `${data.nickname} 离开了聊天`, ts: Date.now() },
          ])
          break

        case 'message': {
          const roomKey = roomKeyRef.current
          if (!roomKey) break

          const plaintext = decryptMessage(data.payload, data.nonce, roomKey)
          if (plaintext === null) break

          const isMine = data.from === nicknameRef.current
          const now = Date.now()
          setMessages((prev) => [
            ...prev,
            {
              id: data.msgId,
              type: 'chat',
              text: plaintext,
              from: data.from,
              ts: data.ts,
              mine: isMine,
              mediaType: data.mediaType || 'text',
              // Per-reader burn: start MY countdown from when I see the message
              burnStartedAt: isMine ? undefined : now,
            },
          ])

          // Auto-ack if not mine
          if (!isMine) {
            send({ type: 'ack', roomId, msgId: data.msgId })
          }
          break
        }

        case 'ack':
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== data.msgId) return m
              return {
                ...m,
                readBy: data.readBy,
                // Sender: start burn countdown from first ack by someone else
                burnStartedAt: m.mine && !m.burnStartedAt && data.readBy > 1
                  ? Date.now()
                  : m.burnStartedAt,
              }
            }),
          )
          break

        case 'burn':
          setMessages((prev) =>
            prev.map((m) =>
              m.id === data.msgId ? { ...m, burning: true } : m,
            ),
          )
          // Remove after animation
          setTimeout(() => {
            setMessages((prev) => prev.filter((m) => m.id !== data.msgId))
          }, 600)
          break

        case 'typing':
          setTyping(true)
          clearTimeout(typingTimer.current)
          typingTimer.current = setTimeout(() => setTyping(false), 2000)
          break

        case 'screenshot':
          setScreenshotAlert(data.by)
          setTimeout(() => setScreenshotAlert(null), 5000)
          break

        case 'room_expired':
          setMessages((prev) => [
            ...prev,
            { id: generateMsgId(), type: 'system', text: '房间已过期，聊天结束', ts: Date.now() },
          ])
          break

        case 'error':
          console.error('Server error:', data.message)
          break
      }
    })
  }, [onMessage, roomId, send])

  const join = useCallback(
    (nickname: string) => {
      nicknameRef.current = nickname
      send({ type: 'join', roomId, nickname })
    },
    [send, roomId],
  )

  const sendMessage = useCallback(
    (text: string) => {
      const roomKey = roomKeyRef.current
      if (!roomKey) return

      const msgId = generateMsgId()
      const { payload, nonce } = encryptMessage(text, roomKey)
      send({ type: 'message', roomId, payload, nonce, msgId, mediaType: 'text' })
    },
    [send, roomId],
  )

  const sendImage = useCallback(
    (dataUrl: string) => {
      const roomKey = roomKeyRef.current
      if (!roomKey) return

      const msgId = generateMsgId()
      const { payload, nonce } = encryptMessage(dataUrl, roomKey)
      send({ type: 'message', roomId, payload, nonce, msgId, mediaType: 'image' })
    },
    [send, roomId],
  )

  const sendTyping = useCallback(() => {
    send({ type: 'typing', roomId })
  }, [send, roomId])

  const reportScreenshot = useCallback(() => {
    send({ type: 'screenshot', roomId })
  }, [send, roomId])

  return {
    messages,
    members,
    online,
    roomInfo,
    typing,
    screenshotAlert,
    connected,
    join,
    sendMessage,
    sendImage,
    sendTyping,
    reportScreenshot,
  }
}
