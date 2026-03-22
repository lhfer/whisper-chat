import 'dotenv/config'

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  appUrl: process.env.APP_URL || 'http://localhost:5173',

  // Feishu
  feishuAppId: process.env.FEISHU_APP_ID || '',
  feishuAppSecret: process.env.FEISHU_APP_SECRET || '',

  // Defaults
  roomDefaultTtl: parseInt(process.env.ROOM_DEFAULT_TTL || '86400', 10),       // 24h
  burnDefaultSeconds: parseInt(process.env.BURN_DEFAULT_SECONDS || '30', 10),  // 30s
  roomMaxMembers: parseInt(process.env.ROOM_MAX_MEMBERS || '20', 10),
} as const
