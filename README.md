# 🔒 WhisperChat — 飞书匿名加密聊天

**在飞书中一键开启匿名加密对话，消息阅后即焚，服务器零存储。**

WhisperChat 是一个面向飞书的匿名聊天工具。基于端到端加密（E2E），消息在你的设备上加密、在对方设备上解密，服务器全程只看到密文，从技术上无法查看任何聊天内容。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 为什么需要 WhisperChat？

在职场沟通中，有些话题需要真正的隐私保护：

- 💰 薪资讨论、晋升交流
- 💬 对管理决策的真实反馈
- 🤝 跨部门敏感沟通
- 🔔 任何你不希望被记录、被截屏、被回溯的对话

现有的飞书/钉钉/微信消息都经过平台服务器，管理员可导出聊天记录。WhisperChat 从架构上解决这个问题——**服务器从未接触过你的消息明文**。

## 核心特性

### 🔐 端到端加密（E2E Encryption）
- 使用 [TweetNaCl.js](https://tweetnacl.js.org/)（Curve25519-XSalsa20-Poly1305），经过 Cure53 安全审计
- 房间密钥通过 URL fragment（`#` 后的部分）分发，**浏览器不会将 fragment 发送到服务器**（HTTP 规范）
- 每条消息使用独立随机 nonce，防止重放攻击
- 图片同样加密后传输，服务器收到的是密文 blob

### 🔥 阅后即焚
- **每人独立计时**：每个读者从看到消息的那一刻开始独立倒计时（借鉴 AWS Wickr 设计）
- 可配置销毁时间：10秒 / 30秒 / 1分钟 / 5分钟
- 消息同时从客户端 DOM 和服务端内存中清除
- 消失动画，视觉反馈清晰

### 🛡️ 访问控制
- **群聊模式**：群里发 `/whisper`，自动限制为本群成员可进入
- **邀请模式**：私聊 bot 发 `/whisper @小明 @小红`，仅你和被邀请的人可进入
- **开放模式**：私聊 bot 发 `/whisper`，任何持链接的人可进入
- 通过飞书 OAuth 验证身份，验证后立即丢弃 open_id

### 💨 零存储架构
- 所有数据仅存在于 Node.js 进程内存中，**没有数据库、没有 Redis、没有文件写入**
- 容器重启 = 所有数据消失
- Docker 日志限制为 5MB，不记录任何消息内容
- 房间 24 小时后自动销毁

### 👁 防泄露体系
- **隐形水印**：每个用户的屏幕嵌入不可见的 session 标识，截屏泄露可追溯
- **截屏检测**：切后台 / PrintScreen 时通知所有参与者
- **内容保护**：禁用文本选择、右键菜单

---

## 快速开始

### 前置条件

- Node.js >= 22
- pnpm
- Docker & Docker Compose（部署用）
- 飞书开放平台应用（[创建应用](https://open.feishu.cn/)）

### 本地开发

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/whisper-chat.git
cd whisper-chat

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env
# 编辑 .env，填入你的飞书 App ID 和 App Secret

# 启动开发服务器（前后端同时启动）
pnpm dev
```

访问 http://localhost:5173 即可使用。

### Docker 部署

```bash
# 配置环境变量
cp .env.example .env
# 编辑 .env

# 一键部署
docker compose up -d
```

服务运行在端口 4000，通过反向代理（Caddy/Nginx）提供 HTTPS。

### 飞书应用配置

1. 在 [飞书开放平台](https://open.feishu.cn/) 创建企业自建应用
2. 开启 **机器人** 能力
3. **事件订阅** → 请求地址填 `https://your-domain.com/api/bot/event`
4. 添加事件：`im.message.receive_v1`
5. **权限管理** → 开通：
   - `im:message` — 获取与发送消息
   - `im:message:send_as_bot` — 以应用身份发消息
   - `im:chat:readonly` — 获取群组信息（群成员限制功能需要）
6. 发布应用

---

## 使用方式

### 私聊 Bot

| 命令 | 效果 |
|------|------|
| `/whisper` | 创建开放房间（默认 30 秒阅后即焚） |
| `/whisper 60` | 创建 1 分钟阅后即焚的房间 |
| `/whisper @小明 @小红` | 创建仅限你、小明、小红的私密房间 |
| `/whisper 10 @小明` | 10 秒阅后即焚，仅限你和小明 |

### 群聊

| 命令 | 效果 |
|------|------|
| `/whisper` | 仅本群成员可进入 |
| `/whisper 60` | 1 分钟阅后即焚，仅本群成员 |

Bot 会回复一张交互卡片，点击即可在飞书侧边栏中打开聊天室。

---

## 安全架构

### 加密流程

```
创建房间
  ├── 服务端生成 room_id
  ├── 客户端生成 room_key（32 字节随机密钥）
  └── room_key 编码到 URL fragment: /r/{room_id}#{base64url(room_key)}
      └── # 后的内容不会发送到服务器（HTTP/HTTPS 规范）

发送消息
  ├── 发送端：nonce = random(24 bytes)
  ├── 发送端：ciphertext = nacl.secretbox(plaintext, nonce, room_key)
  ├── 发送端 → 服务器：{ ciphertext, nonce }（全是密文）
  ├── 服务器：原样转发给房间内其他人（无法解密）
  └── 接收端：plaintext = nacl.secretbox.open(ciphertext, nonce, room_key)
```

### 服务器能看到什么？

| 能看到 | 不能看到 |
|--------|----------|
| 房间 ID | 房间密钥（在 URL fragment 中） |
| 在线人数 | 消息明文（全程密文） |
| 消息密文（无法解密） | 用户真实身份（验证后丢弃） |
| 消息时间戳 | 图片内容（加密后传输） |

### 信任模型

**不要求你信任我们的承诺，请验证我们的代码：**

1. **代码开源** — 加密逻辑完全透明，欢迎审计
2. **浏览器可验证** — 打开 DevTools → Network，你会看到所有 WebSocket 消息都是密文
3. **密钥从不经过服务器** — URL fragment 机制是 HTTP 协议保证，不是我们的承诺
4. **零存储可验证** — 服务端没有数据库、没有文件写入，内存数据随容器重启消失

### 防截屏的诚实说明

**Web 端无法完全阻止截屏**——这是物理限制，任何声称"100% 防截屏"的 Web 应用都不可信。我们的策略是**提高泄露成本**：

- 隐形水印让截屏可追溯到泄露者
- 截屏检测让所有参与者知道有人可能截屏了
- CSS 保护增加 casual 截屏的难度

如果你需要绝对防截屏，请使用 Native 应用（如 Confide）。

---

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 + TypeScript + Vite |
| 加密 | TweetNaCl.js（Cure53 审计） |
| 实时通信 | WebSocket |
| 后端 | Node.js + Fastify |
| 飞书集成 | @larksuiteoapi/node-sdk |
| 部署 | Docker Compose |

## 项目结构

```
packages/
├── server/              # 后端 — 零知识中转服务
│   └── src/
│       ├── app.ts       # Fastify 入口
│       ├── ws/hub.ts    # WebSocket 房间管理
│       ├── room/        # 内存房间 CRUD
│       └── bot/         # 飞书 Bot + OAuth
│
└── web/                 # 前端 — E2E 加密聊天 UI
    └── src/
        ├── crypto/      # 加密引擎 + 隐形水印
        ├── chat/        # 聊天室 UI 组件
        ├── hooks/       # WebSocket + 房间状态 + 飞书认证
        └── components/  # 入口页面
```

---

## 与其他方案的对比

| 维度 | 飞书原生 | Signal | Telegram 密聊 | Confide | **WhisperChat** |
|------|---------|--------|-------------|---------|----------------|
| 入口 | 飞书内 | 独立 App | 独立 App | 独立 App | **飞书内一键启动** |
| E2E 加密 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 阅后即焚 | ❌ | ✅ | ✅ | ✅ | ✅ |
| 匿名 | ❌ | ❌ 需手机号 | ❌ 需手机号 | ❌ 需注册 | **✅ 完全匿名** |
| 服务器零存储 | ❌ | 部分 | ❌ | 部分 | **✅** |
| 中国可用 | ✅ | ❌ 被墙 | ⚠️ | ⚠️ | **✅** |
| 零安装 | ✅ | ❌ | ❌ | ❌ | **✅ 点击即用** |

---

## 贡献

欢迎提交 Issue 和 PR。安全相关的发现请通过 Issue 私密报告。

## 许可

[MIT](LICENSE)
