import { useState, useEffect } from 'react'

interface Props {
  burnAt: number  // timestamp when message will be burned
  onBurn: () => void
}

export function BurnTimer({ burnAt, onBurn }: Props) {
  const [remaining, setRemaining] = useState(() => Math.max(0, burnAt - Date.now()))

  useEffect(() => {
    if (remaining <= 0) {
      onBurn()
      return
    }

    const timer = setInterval(() => {
      const left = Math.max(0, burnAt - Date.now())
      setRemaining(left)
      if (left <= 0) {
        onBurn()
        clearInterval(timer)
      }
    }, 100)

    return () => clearInterval(timer)
  }, [burnAt, onBurn, remaining])

  const seconds = Math.ceil(remaining / 1000)
  const progress = remaining / (burnAt - (burnAt - remaining)) // simplified
  const width = Math.max(0, Math.min(100, (remaining / 30000) * 100)) // assume 30s max for bar

  return (
    <div style={styles.container}>
      <div style={styles.bar}>
        <div style={{
          ...styles.fill,
          width: `${width}%`,
          backgroundColor: seconds <= 5 ? '#ef4444' : seconds <= 15 ? '#f97316' : '#4ade80',
        }} />
      </div>
      <span style={{
        ...styles.text,
        color: seconds <= 5 ? '#ef4444' : '#888',
      }}>
        {seconds}s
      </span>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bar: {
    flex: 1,
    height: 3,
    backgroundColor: '#1e1e2e',
    borderRadius: 2,
    overflow: 'hidden',
    maxWidth: 60,
  },
  fill: {
    height: '100%',
    borderRadius: 2,
    transition: 'width 0.1s linear, background-color 0.3s',
  },
  text: {
    fontSize: 11,
    fontVariantNumeric: 'tabular-nums',
  },
}
