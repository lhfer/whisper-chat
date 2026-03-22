import { useEffect, useState } from 'react'

/**
 * OAuth callback page: /auth/callback?code=xxx
 * Exchanges code for open_id, saves it, then redirects back to the room.
 */
export function AuthCallback() {
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')

    if (!code) {
      setError('授权失败：未收到授权码')
      return
    }

    // Exchange code for open_id
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
      .then(async (resp) => {
        if (resp.ok) {
          const data = await resp.json()
          if (data.open_id) {
            sessionStorage.setItem('whisper_open_id', data.open_id)

            // Redirect back to the room page
            const returnUrl = sessionStorage.getItem('whisper_return_url')
            sessionStorage.removeItem('whisper_return_url')

            if (returnUrl) {
              window.location.href = returnUrl
            } else {
              setError('找不到原始房间链接，请重新从飞书卡片进入')
            }
            return
          }
        }
        setError('身份验证失败，请重试')
      })
      .catch(() => {
        setError('网络错误，请重试')
      })
  }, [])

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {error ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
            <h2 style={styles.title}>验证失败</h2>
            <p style={styles.subtitle}>{error}</p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
            <h2 style={styles.title}>正在验证身份...</h2>
            <p style={styles.subtitle}>请稍候</p>
          </>
        )}
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
  },
}
