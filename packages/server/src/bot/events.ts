import crypto from 'crypto'
import * as lark from '@larksuiteoapi/node-sdk'
import type { FastifyInstance } from 'fastify'
import { config } from '../config.js'
import { createRoom } from '../room/manager.js'
import { buildRoomCard, buildTextCard } from './cards.js'
import { getChatMemberOpenIds } from './auth.js'

/** Generate a room key and encode as URL-safe base64 */
function generateRoomKey(): string {
  return crypto.randomBytes(32).toString('base64url')
}

let client: lark.Client

export function initFeishuBot() {
  if (!config.feishuAppId || !config.feishuAppSecret) {
    console.warn('Feishu credentials not configured, bot disabled')
    return
  }

  client = new lark.Client({
    appId: config.feishuAppId,
    appSecret: config.feishuAppSecret,
    appType: lark.AppType.SelfBuild,
  })

  console.log('Feishu bot initialized (HTTP callback mode)')
}

export function registerBotRoutes(app: FastifyInstance) {
  if (!client) return

  app.post('/api/bot/event', async (req, reply) => {
    const body = req.body as any
    console.log('[bot] received callback:', JSON.stringify(body).slice(0, 800))

    // URL verification challenge
    if (body?.type === 'url_verification') {
      return reply.send({ challenge: body.challenge })
    }

    // v2.0 event format
    if (body?.header?.event_type === 'im.message.receive_v1') {
      const event = body.event
      const chatId = event?.message?.chat_id
      const messageType = event?.message?.message_type
      const content = event?.message?.content
      const chatType = event?.message?.chat_type  // 'p2p' or 'group'
      const senderOpenId = event?.sender?.sender_id?.open_id
      const mentions = event?.message?.mentions as Array<{ key: string; id: { open_id: string }; name: string }> | undefined

      if (messageType === 'text' && chatId) {
        try {
          const text = JSON.parse(content).text
          console.log('[bot] text:', text, 'chatType:', chatType, 'sender:', senderOpenId, 'mentions:', mentions?.length ?? 0)
          await handleCommand({ text, chatId, chatType, senderOpenId, mentions })
        } catch (err) {
          console.error('[bot] handler error:', err)
        }
      }

      return reply.send({ code: 0 })
    }

    return reply.send({ code: 0 })
  })

  console.log('[bot] HTTP callback route registered at /api/bot/event')
}

interface CommandContext {
  text: string
  chatId: string
  chatType?: string
  senderOpenId?: string
  mentions?: Array<{ key: string; id: { open_id: string }; name: string }>
}

async function handleCommand(ctx: CommandContext) {
  const { text, chatId, chatType, senderOpenId, mentions } = ctx
  // Remove @mentions from text to get clean command
  const cleaned = text.replace(/@_user_\d+/g, '').replace(/@\S+/g, '').trim()
  console.log('[bot] handleCommand:', cleaned, 'mentions:', mentions?.map(m => m.name))

  // Match: /whisper [burnSeconds]
  const whisperMatch = cleaned.match(/^\/whisper(?:\s+(\d+))?$/i)
  if (whisperMatch) {
    const burnSeconds = whisperMatch[1]
      ? parseInt(whisperMatch[1], 10)
      : config.burnDefaultSeconds

    let allowedMembers: string[] | null = null
    let memberNames: string[] = []

    if (chatType === 'group') {
      // Group chat: restrict to group members
      console.log('[bot] group mode: fetching members for chat:', chatId)
      allowedMembers = await getChatMemberOpenIds(chatId)
      console.log('[bot] allowed members:', allowedMembers.length)
    } else if (mentions && mentions.length > 0) {
      // Private chat with @mentions: restrict to sender + mentioned users
      const mentionedIds = mentions
        .map(m => m.id?.open_id)
        .filter((id): id is string => !!id)
      memberNames = mentions.map(m => m.name).filter(Boolean)

      if (mentionedIds.length > 0) {
        allowedMembers = [...mentionedIds]
        // Add the sender too
        if (senderOpenId && !allowedMembers.includes(senderOpenId)) {
          allowedMembers.push(senderOpenId)
        }
        console.log('[bot] invite mode: allowed', allowedMembers.length, 'members:', memberNames)
      }
    }

    const roomConfig = createRoom({ burnSeconds, allowedMembers })
    const roomKey = generateRoomKey()
    const roomUrl = `${config.appUrl}/r/${roomConfig.id}#${roomKey}`

    const isRestricted = allowedMembers !== null
    await sendCard(chatId, buildRoomCard(roomConfig, roomUrl, isRestricted, memberNames))

    // If mentions exist, also send the room card to each mentioned user via private message
    if (mentions && mentions.length > 0 && chatType === 'p2p') {
      for (const mention of mentions) {
        const openId = mention.id?.open_id
        if (openId) {
          try {
            await sendCardToUser(openId, buildRoomCard(roomConfig, roomUrl, true, memberNames))
          } catch (err) {
            console.error('[bot] Failed to send invite to', mention.name, err)
          }
        }
      }
    }

    return
  }

  // Help
  await sendCard(chatId, buildTextCard(
    '🔒 WhisperChat',
    [
      '**创建匿名聊天室：**',
      '',
      '`/whisper` — 开放房间，30秒阅后即焚',
      '`/whisper 10` — 开放房间，10秒阅后即焚',
      '',
      '**邀请指定成员（私聊bot时）：**',
      '`/whisper` @成员A @成员B — 仅你和被邀请的人可进入',
      '`/whisper 60` @成员A — 1分钟阅后即焚，仅限你们两人',
      '',
      '**群聊中使用：**',
      '群里发 `/whisper` — 自动限制为本群成员可进入',
    ].join('\n'),
  ))
}

async function sendCard(chatId: string, card: object) {
  try {
    await client.im.message.create({
      params: { receive_id_type: 'chat_id' },
      data: {
        receive_id: chatId,
        msg_type: 'interactive',
        content: JSON.stringify(card),
      },
    })
  } catch (err) {
    console.error('[bot] Failed to send card to chat:', err)
  }
}

async function sendCardToUser(openId: string, card: object) {
  await client.im.message.create({
    params: { receive_id_type: 'open_id' },
    data: {
      receive_id: openId,
      msg_type: 'interactive',
      content: JSON.stringify(card),
    },
  })
}
