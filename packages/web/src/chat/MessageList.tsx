import { useEffect, useRef } from 'react'
import { Message } from './Message'
import type { ChatMessage } from '../types'

interface Props {
  messages: ChatMessage[]
  typing: boolean
  burnSeconds?: number
}

export function MessageList({ messages, typing, burnSeconds }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, typing])

  return (
    <div style={styles.container}>
      {messages.length === 0 && (
        <div style={styles.empty}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
          <div>端到端加密聊天</div>
          <div style={{ fontSize: 13, color: '#555', marginTop: 4 }}>
            消息仅在你们的设备上解密
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <Message key={msg.id} message={msg} burnSeconds={burnSeconds} />
      ))}

      {typing && (
        <div style={styles.typing}>
          <span style={styles.dot} /><span style={styles.dot} /><span style={styles.dot} />
          有人正在输入...
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    flex: 1,
    overflowY: 'auto',
    paddingTop: 16,
    paddingBottom: 16,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    color: '#888',
    fontSize: 15,
  },
  typing: {
    padding: '4px 16px',
    fontSize: 13,
    color: '#666',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  dot: {
    display: 'inline-block',
    width: 5,
    height: 5,
    borderRadius: '50%',
    backgroundColor: '#666',
    animation: 'blink 1.2s infinite',
  },
}
