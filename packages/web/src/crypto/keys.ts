import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

/**
 * Generate a new room key (32 bytes)
 */
export function generateRoomKey(): Uint8Array {
  return nacl.randomBytes(32)
}

/**
 * Encode room key to URL-safe base64 for use in URL fragment
 */
export function encodeRoomKey(key: Uint8Array): string {
  return encodeBase64(key)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/**
 * Decode room key from URL-safe base64
 */
export function decodeRoomKey(encoded: string): Uint8Array {
  const base64 = encoded
    .replace(/-/g, '+')
    .replace(/_/g, '/')
  // Add padding
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
  return decodeBase64(padded)
}

/**
 * Extract room key from current URL fragment
 * URL format: /r/{roomId}#{base64url(roomKey)}
 */
export function getRoomKeyFromUrl(): Uint8Array | null {
  const fragment = window.location.hash.slice(1) // remove #
  if (!fragment) return null
  try {
    return decodeRoomKey(fragment)
  } catch {
    return null
  }
}

/**
 * Build a room URL with the key in the fragment
 */
export function buildRoomUrl(roomId: string, roomKey: Uint8Array): string {
  const origin = window.location.origin
  return `${origin}/r/${roomId}#${encodeRoomKey(roomKey)}`
}

/**
 * Generate a unique message ID
 */
export function generateMsgId(): string {
  return encodeBase64(nacl.randomBytes(12)).replace(/[+/=]/g, (c) =>
    c === '+' ? '-' : c === '/' ? '_' : ''
  )
}
