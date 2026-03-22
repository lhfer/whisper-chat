import { useState, useEffect } from 'react'
import { randomNickname, nicknameColor } from '../utils/names'
import { getRoomKeyFromUrl } from '../crypto/keys'
import { useFeishuAuth } from '../hooks/useFeishuAuth'

interface Props {
  roomId: string
  onJoin: (nickname: string) => void
}

export function JoinRoom({ roomId, onJoin }: Props) {
  const [nickname, setNickname] = useState(() => randomNickname())
  const [hasKey, setHasKey] = useState(true)
  const [roomStatus, setRoomStatus] = useState<'loading' | 'ok' | 'expired' | 'restricted'>('loading')
  const { auth, authenticate } = useFeishuAuth()

  useEffect(() => {
    const key = getRoomKeyFromUrl()
    if (!key) setHasKey(false)
  }, [])

  useEffect(() => {
    fetch(`/api/rooms/${roomId}`)
      .then(async (res) => {
        if (!res.ok) { setRoomStatus('expired'); return }
        const data = await res.json()
        setRoomStatus(data.restricted ? 'restricted' : 'ok')
      })
      .catch(() => setRoomStatus('expired'))
  }, [roomId])

  const handleJoin = async () => {
    if (roomStatus === 'restricted') {
      const allowed = await authenticate(roomId)
      if (!allowed) return
    }
    onJoin(nickname)
  }

  const regenerate = () => setNickname(randomNickname())

  if (!hasKey) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔑</div>
          <h2 style={styles.title}>缺少房间密钥</h2>
          <p style={styles.subtitle}>链接不完整。请使用包含完整密钥的链接加入聊天。</p>
        </div>
      </div>
    )
  }

  if (roomStatus === 'expired') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💨</div>
          <h2 style={styles.title}>房间已过期</h2>
          <p style={styles.subtitle}>这个聊天室已经不存在了。所有消息已被销毁。</p>
        </div>
      </div>
    )
  }

  if (roomStatus === 'loading') {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ fontSize: 18, color: '#888' }}>连接中...</div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
        <h2 style={styles.title}>WhisperChat</h2>
        <p style={styles.subtitle}>匿名 · 加密 · 阅后即焚</p>

        {roomStatus === 'restricted' && (
          <div style={styles.restrictedBadge}>
            🛡️ 仅限群成员 · 需飞书身份验证
          </div>
        )}

        <div style={styles.nicknamePreview}>
          <div style={{ ...styles.avatar, backgroundColor: nicknameColor(nickname) }}>
            {nickname[0]}
          </div>
          <span style={styles.nickText}>{nickname}</span>
          <button style={styles.refreshBtn} onClick={regenerate}>🎲 换一个</button>
        </div>

        {auth.error && (
          <div style={styles.errorBox}>{auth.error}</div>
        )}

        <button
          style={{ ...styles.joinBtn, opacity: auth.status === 'loading' ? 0.6 : 1 }}
          onClick={handleJoin}
          disabled={auth.status === 'loading'}
        >
          {auth.status === 'loading' ? '验证身份中...' :
           roomStatus === 'restricted' ? '🛡️ 验证身份并加入' : '加入聊天'}
        </button>

        <div style={styles.hints}>
          <div>🔐 端到端加密，服务器无法查看消息</div>
          <div>🔥 消息阅后即焚，不留痕迹</div>
          <div>👁 隐形水印，截屏可追溯</div>
          {roomStatus === 'restricted' && (
            <div>🛡️ 身份验证后匿名入场，无人知道你是谁</div>
          )}
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
    maxWidth: 380,
    width: '100%',
    border: '1px solid #1e1e2e',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 8,
    color: '#e0e0e0',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 24,
  },
  restrictedBadge: {
    backgroundColor: '#1a2a1a',
    color: '#4ade80',
    fontSize: 13,
    padding: '8px 16px',
    borderRadius: 10,
    marginBottom: 20,
  },
  nicknamePreview: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
    padding: '12px 16px',
    backgroundColor: '#1e1e2e',
    borderRadius: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  nickText: { fontSize: 16, fontWeight: 500 },
  refreshBtn: {
    background: 'none',
    border: '1px solid #2a2a3e',
    borderRadius: 8,
    padding: '4px 10px',
    fontSize: 13,
    color: '#aaa',
    cursor: 'pointer',
  },
  errorBox: {
    backgroundColor: '#3a1a1a',
    color: '#ef4444',
    fontSize: 13,
    padding: '10px 16px',
    borderRadius: 10,
    marginBottom: 16,
  },
  joinBtn: {
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
  hints: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    fontSize: 13,
    color: '#666',
    textAlign: 'left' as const,
  },
}
