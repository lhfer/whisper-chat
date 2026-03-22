import { nicknameColor } from '../utils/names'
import type { ChatMessage } from '../types'

interface Props {
  message: ChatMessage
  burnSeconds?: number
}

export function Message({ message, burnSeconds }: Props) {
  if (message.type === 'system') {
    return (
      <div style={styles.system}>
        {message.text}
      </div>
    )
  }

  const isMine = message.mine
  const color = nicknameColor(message.from || '')
  const isImage = message.mediaType === 'image'

  // Burn progress
  const hasBurnStarted = message.burnStartedAt && burnSeconds
  const burnRemaining = hasBurnStarted
    ? Math.max(0, Math.ceil((message.burnStartedAt! + burnSeconds! * 1000 - Date.now()) / 1000))
    : null

  return (
    <div
      style={{
        ...styles.row,
        flexDirection: isMine ? 'row-reverse' : 'row',
        opacity: message.burning ? 0 : 1,
        transform: message.burning ? 'scale(0.95) translateY(-5px)' : 'none',
        transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
      }}
    >
      {/* Avatar */}
      <div style={{ ...styles.avatar, backgroundColor: color }}>
        {(message.from || '?')[0]}
      </div>

      <div style={{ maxWidth: '70%' }}>
        {/* Nickname */}
        {!isMine && (
          <div style={{ ...styles.nickname, color }}>
            {message.from}
          </div>
        )}

        {/* Bubble */}
        <div
          style={{
            ...styles.bubble,
            backgroundColor: isMine ? '#1a6dff' : '#1e1e2e',
            borderTopRightRadius: isMine ? 4 : 16,
            borderTopLeftRadius: isMine ? 16 : 4,
            padding: isImage ? 4 : '10px 14px',
          }}
        >
          {isImage ? (
            <img
              src={message.text}
              alt="image"
              style={styles.image}
              onLoad={(e) => (e.target as HTMLImageElement).style.opacity = '1'}
            />
          ) : (
            message.text
          )}
        </div>

        {/* Meta */}
        <div style={{
          ...styles.meta,
          textAlign: isMine ? 'right' : 'left',
        }}>
          {new Date(message.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
          {message.readBy !== undefined && message.readBy > (message.mine ? 1 : 0) && (
            <span style={{ marginLeft: 8 }}>
              {message.mine ? `${message.readBy - 1}人已读` : '✓ 已读'}
            </span>
          )}
          {hasBurnStarted && burnRemaining !== null && (
            <span style={{
              marginLeft: 8,
              color: burnRemaining <= 5 ? '#ef4444' : '#f97316',
            }}>
              🔥 {burnRemaining}s
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: 10,
    marginBottom: 16,
    alignItems: 'flex-start',
    padding: '0 16px',
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
    flexShrink: 0,
  },
  nickname: {
    fontSize: 12,
    marginBottom: 4,
    fontWeight: 500,
  },
  bubble: {
    borderRadius: 16,
    fontSize: 15,
    lineHeight: '1.5',
    wordBreak: 'break-word' as const,
    userSelect: 'none' as const,
    WebkitUserSelect: 'none' as const,
  },
  image: {
    maxWidth: '100%',
    maxHeight: 300,
    borderRadius: 12,
    display: 'block',
    opacity: 0,
    transition: 'opacity 0.3s',
  },
  meta: {
    fontSize: 11,
    color: '#666',
    marginTop: 4,
  },
  system: {
    textAlign: 'center' as const,
    color: '#555',
    fontSize: 13,
    padding: '8px 0',
  },
}
