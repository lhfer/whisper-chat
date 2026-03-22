import { useState } from 'react'
import { generateRoomKey, buildRoomUrl } from '../crypto/keys'

export function CreateRoom() {
  const [creating, setCreating] = useState(false)
  const [roomUrl, setRoomUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [burnSeconds, setBurnSeconds] = useState(30)

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ burnSeconds }),
      })
      const data = await res.json()
      const roomKey = generateRoomKey()
      const url = buildRoomUrl(data.room.id, roomKey)
      setRoomUrl(url)

      // Navigate to the room
      window.location.href = url
    } catch (err) {
      console.error('Failed to create room:', err)
    } finally {
      setCreating(false)
    }
  }

  const handleCopy = async () => {
    if (!roomUrl) return
    await navigator.clipboard.writeText(roomUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h1 style={styles.title}>WhisperChat</h1>
        <p style={styles.subtitle}>匿名 · 加密 · 阅后即焚</p>

        <div style={styles.configSection}>
          <label style={styles.label}>阅后即焚时间</label>
          <div style={styles.options}>
            {[
              { value: 10, label: '10秒' },
              { value: 30, label: '30秒' },
              { value: 60, label: '1分钟' },
              { value: 300, label: '5分钟' },
            ].map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.optionBtn,
                  backgroundColor: burnSeconds === opt.value ? '#1a6dff' : '#1e1e2e',
                }}
                onClick={() => setBurnSeconds(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {!roomUrl ? (
          <button
            style={styles.createBtn}
            onClick={handleCreate}
            disabled={creating}
          >
            {creating ? '创建中...' : '创建匿名聊天室'}
          </button>
        ) : (
          <div style={styles.urlBox}>
            <div style={styles.urlText}>{roomUrl}</div>
            <button style={styles.copyBtn} onClick={handleCopy}>
              {copied ? '已复制!' : '复制链接'}
            </button>
            <p style={styles.urlHint}>
              将此链接发给对方。密钥包含在 # 后面，不会发送到服务器。
            </p>
          </div>
        )}

        <div style={styles.features}>
          <div>🔐 端到端加密，服务器无法查看消息</div>
          <div>🔥 消息阅后即焚，不留痕迹</div>
          <div>👁 隐形水印，截屏可追溯</div>
          <div>💨 房间 24 小时后自动销毁</div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100dvh',
    padding: 20,
    backgroundColor: '#0a0a0f',
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 20,
    padding: '40px 32px',
    textAlign: 'center' as const,
    maxWidth: 420,
    width: '100%',
    border: '1px solid #1e1e2e',
  },
  title: {
    fontSize: 28,
    fontWeight: 700,
    marginBottom: 8,
    color: '#e0e0e0',
  },
  subtitle: {
    fontSize: 15,
    color: '#888',
    marginBottom: 32,
  },
  configSection: {
    marginBottom: 24,
    textAlign: 'left' as const,
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
    display: 'block',
  },
  options: {
    display: 'flex',
    gap: 8,
  },
  optionBtn: {
    flex: 1,
    padding: '8px 0',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    color: '#e0e0e0',
    fontSize: 13,
    cursor: 'pointer',
  },
  createBtn: {
    width: '100%',
    padding: '14px 0',
    backgroundColor: '#1a6dff',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: 'pointer',
    marginBottom: 24,
  },
  urlBox: {
    marginBottom: 24,
  },
  urlText: {
    backgroundColor: '#1e1e2e',
    padding: '10px 14px',
    borderRadius: 8,
    fontSize: 12,
    color: '#4ade80',
    wordBreak: 'break-all' as const,
    marginBottom: 8,
    textAlign: 'left' as const,
  },
  copyBtn: {
    width: '100%',
    padding: '10px 0',
    backgroundColor: '#1a6dff',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    cursor: 'pointer',
    marginBottom: 8,
  },
  urlHint: {
    fontSize: 12,
    color: '#666',
  },
  features: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'left' as const,
  },
}
