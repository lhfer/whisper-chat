import crypto from 'crypto'
import type { FastifyInstance } from 'fastify'
import * as lark from '@larksuiteoapi/node-sdk'
import { config } from '../config.js'
import { getRoom } from '../room/manager.js'

let client: lark.Client
let ticketCache: { ticket: string; expiresAt: number } | null = null

export function initAuthClient() {
  if (!config.feishuAppId || !config.feishuAppSecret) return
  client = new lark.Client({
    appId: config.feishuAppId,
    appSecret: config.feishuAppSecret,
    appType: lark.AppType.SelfBuild,
  })
}

/** Get JSSDK ticket (cached for ~2 hours) */
async function getJsapiTicket(): Promise<string> {
  if (ticketCache && Date.now() < ticketCache.expiresAt) {
    return ticketCache.ticket
  }
  const resp = await (client as any).jssdk.ticket.get({})
  const ticket = resp?.data?.ticket
  if (!ticket) throw new Error('Failed to get jsapi ticket')
  ticketCache = { ticket, expiresAt: Date.now() + 6000_000 } // ~100 min
  return ticket
}

/** Get group members' open_ids */
export async function getChatMemberOpenIds(chatId: string): Promise<string[]> {
  if (!client) return []
  const allIds: string[] = []
  let pageToken: string | undefined

  try {
    do {
      const resp: any = await client.im.chatMembers.get({
        path: { chat_id: chatId },
        params: {
          member_id_type: 'open_id',
          page_size: 100,
          ...(pageToken ? { page_token: pageToken } : {}),
        },
      })

      if (resp?.data?.items) {
        for (const item of resp.data.items) {
          if (item.member_id) allIds.push(item.member_id)
        }
      }
      pageToken = resp?.data?.page_token
      if (!resp?.data?.has_more) break
    } while (pageToken)
  } catch (err) {
    console.error('[auth] Failed to get chat members:', err)
    // Return empty array — room will be restricted but no one can enter
    // This is safer than falling back to open room
    return []
  }

  return allIds
}

export function registerAuthRoutes(app: FastifyInstance) {
  if (!client) return

  // Return app_id for OAuth redirect
  app.get('/api/auth/app-id', async () => {
    return { appId: config.feishuAppId }
  })

  // Exchange auth code for open_id
  app.post<{ Body: { code: string } }>('/api/auth/login', async (req, reply) => {
    const { code } = req.body || {}
    if (!code) return reply.code(400).send({ error: 'Missing code' })

    try {
      // Step 1: Get app_access_token via raw API
      const tokenResp = await fetch(
        'https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            app_id: config.feishuAppId,
            app_secret: config.feishuAppSecret,
          }),
        },
      )
      const tokenData: any = await tokenResp.json()
      console.log('[auth] app_token response code:', tokenData?.code)

      const appToken = tokenData?.app_access_token
      if (!appToken) {
        console.error('[auth] Failed to get app token:', tokenData)
        return reply.code(500).send({ error: 'Failed to get app token' })
      }

      // Step 2: Exchange code for user access_token (use v1 non-OIDC endpoint — returns open_id directly)
      const userResp = await fetch(
        'https://open.feishu.cn/open-apis/authen/v1/access_token',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${appToken}`,
          },
          body: JSON.stringify({ grant_type: 'authorization_code', code }),
        },
      )
      const userData: any = await userResp.json()
      console.log('[auth] user response code:', userData?.code, 'open_id:', userData?.data?.open_id)

      if (userData?.data?.open_id) {
        return { open_id: userData.data.open_id }
      }

      console.error('[auth] OAuth failed:', JSON.stringify(userData))
      return reply.code(401).send({ error: 'Auth failed' })
    } catch (err) {
      console.error('[auth] Login error:', err)
      return reply.code(500).send({ error: 'Auth error' })
    }
  })

  // Verify if open_id is allowed in a room
  app.post<{ Body: { roomId: string; openId: string } }>('/api/auth/verify-room', async (req, reply) => {
    const { roomId, openId } = req.body || {}
    if (!roomId || !openId) return reply.code(400).send({ error: 'Missing params' })

    const room = getRoom(roomId)
    if (!room) return reply.code(404).send({ error: 'Room not found' })

    // Open room — anyone can join
    if (!room.config.allowedMembers) {
      return { allowed: true }
    }

    // Restricted room — check membership
    const allowed = room.config.allowedMembers.includes(openId)
    if (!allowed) {
      return reply.code(403).send({ error: 'Not a member of this chat group', allowed: false })
    }

    return { allowed: true }
  })
}
