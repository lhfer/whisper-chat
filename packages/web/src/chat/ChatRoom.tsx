import { useEffect } from 'react'
import { useRoom } from '../hooks/useRoom'
import { MessageList } from './MessageList'
import { InputBar } from './InputBar'
import { mountWatermark } from '../crypto/watermark'

interface Props {
  roomId: string
  nickname: string
}

export function ChatRoom({ roomId, nickname }: Props) {
  const {
    messages,
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
  } = useRoom(roomId)

  // Join room on mount
  useEffect(() => {
    if (connected) {
      join(nickname)
    }
  }, [connected, join, nickname])

  // Mount invisible watermark
  useEffect(() => {
    const cleanup = mountWatermark(nickname)
    return cleanup
  }, [nickname])

  // Screenshot detection
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        reportScreenshot()
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        reportScreenshot()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [reportScreenshot])

  // Disable right-click & text selection
  useEffect(() => {
    const prevent = (e: Event) => e.preventDefault()
    document.addEventListener('contextmenu', prevent)
    document.addEventListener('selectstart', prevent)
    return () => {
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('selectstart', prevent)
    }
  }, [])

  const burnLabel = roomInfo
    ? roomInfo.burnSeconds < 60
      ? `${roomInfo.burnSeconds}秒`
      : `${Math.floor(roomInfo.burnSeconds / 60)}分钟`
    : '...'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <span style={styles.lock}>🔒</span>
          <span style={styles.title}>匿名聊天</span>
          <span style={styles.badge}>{online} 在线</span>
        </div>
        <div style={styles.headerRight}>
          <span style={styles.burnBadge}>🔥 {burnLabel}</span>
          {!connected && <span style={styles.offline}>断开连接</span>}
        </div>
      </div>

      {/* Screenshot alert */}
      {screenshotAlert && (
        <div style={styles.alert}>
          ⚠️ {screenshotAlert} 可能进行了截屏
        </div>
      )}

      {/* Messages */}
      <MessageList messages={messages} typing={typing} burnSeconds={roomInfo?.burnSeconds} />

      {/* Input */}
      <InputBar
        onSend={sendMessage}
        onSendImage={sendImage}
        onTyping={sendTyping}
        disabled={!connected}
      />

      {/* Security footer */}
      <div style={styles.footer}>
        🔐 端到端加密 · 服务器零存储 · 阅后即焚
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100dvh',
    maxWidth: 600,
    margin: '0 auto',
    backgroundColor: '#0a0a0f',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid #1e1e2e',
    backgroundColor: '#0d0d14',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  lock: { fontSize: 18 },
  title: { fontSize: 16, fontWeight: 600 },
  badge: {
    backgroundColor: '#1a3a1a',
    color: '#4ade80',
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 10,
  },
  burnBadge: {
    backgroundColor: '#3a1a1a',
    color: '#f97316',
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 10,
  },
  offline: {
    backgroundColor: '#3a1a1a',
    color: '#ef4444',
    fontSize: 12,
    padding: '2px 8px',
    borderRadius: 10,
  },
  alert: {
    backgroundColor: '#3a2a1a',
    color: '#fbbf24',
    padding: '8px 16px',
    fontSize: 13,
    textAlign: 'center' as const,
  },
  footer: {
    textAlign: 'center' as const,
    padding: '6px 0',
    fontSize: 11,
    color: '#444',
    borderTop: '1px solid #1e1e2e',
  },
}
