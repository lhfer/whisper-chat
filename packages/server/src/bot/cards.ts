import type { RoomConfig } from '../types.js'

const GITHUB_URL = 'https://github.com/lhfer/whisper-chat'

/**
 * Wrap a URL to open in Feishu sidebar
 */
function sidebarUrl(url: string): string {
  return `https://applink.feishu.cn/client/web_url/open?mode=sidebar-semi&reload=false&url=${encodeURIComponent(url)}`
}

/**
 * Build Feishu interactive card for room invitation
 */
export function buildRoomCard(roomConfig: RoomConfig, roomUrl: string, isRestricted = false, memberNames: string[] = []) {
  const burnLabel = roomConfig.burnSeconds < 60
    ? `${roomConfig.burnSeconds}秒`
    : `${Math.floor(roomConfig.burnSeconds / 60)}分钟`

  const ttlLabel = roomConfig.ttlSeconds < 3600
    ? `${Math.floor(roomConfig.ttlSeconds / 60)}分钟`
    : `${Math.floor(roomConfig.ttlSeconds / 3600)}小时`

  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: '🔒 匿名加密聊天邀请' },
      template: 'indigo',
    },
    elements: [
      {
        tag: 'div',
        text: {
          tag: 'lark_md',
          content: [
            '**端到端加密 · 阅后即焚 · 服务器零存储**',
            '',
            `🔥 阅后即焚: **${burnLabel}**`,
            `⏰ 房间有效期: **${ttlLabel}**`,
            `👥 最大人数: **${roomConfig.maxMembers}人**`,
            '',
            isRestricted
              ? memberNames.length > 0
                ? `🛡️ 仅限邀请成员：${memberNames.join('、')}（需飞书身份验证）`
                : '🛡️ 仅本群成员可进入（需飞书身份验证）'
              : '🌐 开放房间，持链接可进入',
            '⚠️ 消息在你的设备上加密，服务器无法查看内容',
          ].join('\n'),
        },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🚀 加入聊天' },
            type: 'primary',
            url: sidebarUrl(roomUrl),
          },
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🔐 加密原理' },
            type: 'default',
            url: `${GITHUB_URL}#%E5%AE%89%E5%85%A8%E6%9E%B6%E6%9E%84`,
          },
        ],
      },
      {
        tag: 'note',
        elements: [
          {
            tag: 'plain_text',
            content: '密钥包含在链接中，不会经过服务器 | WhisperChat',
          },
        ],
      },
    ],
  }
}

/**
 * Build a simple text card
 */
export function buildTextCard(title: string, content: string, template = 'blue') {
  return {
    config: { wide_screen_mode: true },
    header: {
      title: { tag: 'plain_text', content: title },
      template,
    },
    elements: [
      {
        tag: 'div',
        text: { tag: 'lark_md', content },
      },
      { tag: 'hr' },
      {
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '🔐 加密原理' },
            type: 'default',
            url: `${GITHUB_URL}#%E5%AE%89%E5%85%A8%E6%9E%B6%E6%9E%84`,
          },
        ],
      },
    ],
  }
}
