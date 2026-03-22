import { useState, useRef, useCallback } from 'react'

interface Props {
  onSend: (text: string) => void
  onSendImage: (dataUrl: string) => void
  onTyping: () => void
  disabled?: boolean
}

export function InputBar({ onSend, onSendImage, onTyping, disabled }: Props) {
  const [text, setText] = useState('')
  const typingThrottle = useRef(0)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleSend = useCallback(() => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
  }, [text, onSend])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    const now = Date.now()
    if (now - typingThrottle.current > 2000) {
      typingThrottle.current = now
      onTyping()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        e.preventDefault()
        const file = items[i].getAsFile()
        if (file) processImage(file)
        return
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type.startsWith('image/')) {
      processImage(file)
    }
    e.target.value = ''
  }

  const processImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert('图片不能超过 5MB')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSendImage(reader.result)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div style={styles.container}>
      <button
        style={styles.imageBtn}
        onClick={() => fileRef.current?.click()}
        disabled={disabled}
        title="发送图片"
      >
        🖼
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />
      <textarea
        style={styles.input}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder="输入消息... (Enter 发送，可粘贴图片)"
        rows={1}
        disabled={disabled}
      />
      <button
        style={{
          ...styles.button,
          opacity: text.trim() ? 1 : 0.4,
        }}
        onClick={handleSend}
        disabled={disabled || !text.trim()}
      >
        发送
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    padding: '12px 16px',
    borderTop: '1px solid #1e1e2e',
    backgroundColor: '#0d0d14',
    alignItems: 'flex-end',
  },
  imageBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#1e1e2e',
    border: '1px solid #2a2a3e',
    borderRadius: 12,
    fontSize: 18,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e1e2e',
    color: '#e0e0e0',
    border: '1px solid #2a2a3e',
    borderRadius: 12,
    padding: '10px 14px',
    fontSize: 15,
    resize: 'none' as const,
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: '1.4',
    maxHeight: 120,
  },
  button: {
    backgroundColor: '#1a6dff',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '10px 20px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    flexShrink: 0,
    height: 40,
  },
}
