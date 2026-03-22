import { useState, useCallback } from 'react'

declare global {
  interface Window {
    h5sdk?: {
      ready: (cb: () => void) => void
      config: (opts: any) => void
      requestAuthCode: (opts: any) => void
    }
  }
}

interface AuthState {
  status: 'idle' | 'loading' | 'success' | 'error'
  openId: string | null
  error: string | null
}

/**
 * Authenticate user via Feishu JSSDK → get open_id → verify room access
 */
export function useFeishuAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'idle', openId: null, error: null })

  const authenticate = useCallback(async (roomId: string): Promise<boolean> => {
    // Check if room requires auth
    try {
      const roomResp = await fetch(`/api/rooms/${roomId}`)
      if (!roomResp.ok) return false
      const roomData = await roomResp.json()

      // Open room — no auth needed
      if (!roomData.restricted) {
        setAuth({ status: 'success', openId: null, error: null })
        return true
      }
    } catch {
      setAuth({ status: 'error', openId: null, error: '无法连接服务器' })
      return false
    }

    // Restricted room — need Feishu auth
    setAuth({ status: 'loading', openId: null, error: null })

    // Check if we're in Feishu client
    if (!window.h5sdk) {
      setAuth({ status: 'error', openId: null, error: '请在飞书客户端中打开此链接' })
      return false
    }

    try {
      const openId = await feishuLogin()
      if (!openId) {
        setAuth({ status: 'error', openId: null, error: '飞书身份验证失败' })
        return false
      }

      // Verify room access
      const verifyResp = await fetch('/api/auth/verify-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, openId }),
      })

      if (verifyResp.ok) {
        setAuth({ status: 'success', openId, error: null })
        return true
      } else {
        setAuth({ status: 'error', openId: null, error: '你不是该群的成员，无法进入' })
        return false
      }
    } catch (err) {
      setAuth({ status: 'error', openId: null, error: '身份验证过程出错' })
      return false
    }
  }, [])

  return { auth, authenticate }
}

/** Feishu JSSDK login flow */
function feishuLogin(): Promise<string | null> {
  return new Promise(async (resolve) => {
    try {
      // Get JSSDK config from our server
      const currentUrl = window.location.href.split('#')[0]
      const configResp = await fetch(`/api/auth/jssdk-config?url=${encodeURIComponent(currentUrl)}`)
      if (!configResp.ok) { resolve(null); return }
      const sdkConfig = await configResp.json()

      window.h5sdk!.ready(() => {
        window.h5sdk!.config({
          appId: sdkConfig.appId,
          timestamp: sdkConfig.timestamp,
          nonceStr: sdkConfig.nonceStr,
          signature: sdkConfig.signature,
          jsApiList: ['requestAuthCode'],
          onSuccess: () => {
            window.h5sdk!.requestAuthCode({
              appId: sdkConfig.appId,
              onSuccess: async (res: { code: string }) => {
                // Exchange code for open_id
                const loginResp = await fetch('/api/auth/login', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ code: res.code }),
                })
                if (loginResp.ok) {
                  const data = await loginResp.json()
                  resolve(data.open_id)
                } else {
                  resolve(null)
                }
              },
              onFail: () => resolve(null),
            })
          },
          onFail: () => resolve(null),
        })
      })
    } catch {
      resolve(null)
    }
  })
}
