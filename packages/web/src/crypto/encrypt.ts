import nacl from 'tweetnacl'
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util'

/**
 * Encrypt a text message with the room key
 * Returns { payload: base64(ciphertext), nonce: base64(nonce) }
 */
export function encryptMessage(
  plaintext: string,
  roomKey: Uint8Array,
): { payload: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const messageBytes = decodeUTF8(plaintext)
  const ciphertext = nacl.secretbox(messageBytes, nonce, roomKey)

  return {
    payload: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  }
}

/**
 * Decrypt a message with the room key
 * Returns plaintext string, or null if decryption fails
 */
export function decryptMessage(
  payload: string,
  nonce: string,
  roomKey: Uint8Array,
): string | null {
  try {
    const ciphertext = decodeBase64(payload)
    const nonceBytes = decodeBase64(nonce)
    const decrypted = nacl.secretbox.open(ciphertext, nonceBytes, roomKey)
    if (!decrypted) return null
    return encodeUTF8(decrypted)
  } catch {
    return null
  }
}

/**
 * Encrypt binary data (images) with the room key
 */
export function encryptBinary(
  data: Uint8Array,
  roomKey: Uint8Array,
): { payload: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const ciphertext = nacl.secretbox(data, nonce, roomKey)
  return {
    payload: encodeBase64(ciphertext),
    nonce: encodeBase64(nonce),
  }
}

/**
 * Decrypt binary data
 */
export function decryptBinary(
  payload: string,
  nonce: string,
  roomKey: Uint8Array,
): Uint8Array | null {
  try {
    const ciphertext = decodeBase64(payload)
    const nonceBytes = decodeBase64(nonce)
    return nacl.secretbox.open(ciphertext, nonceBytes, roomKey) ?? null
  } catch {
    return null
  }
}
