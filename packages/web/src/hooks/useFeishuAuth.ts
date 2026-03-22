import { useState, useCallback, useEffect } from 'react'

interface AuthState {
  status: 'idle' | 'loading' | 'success' | 'error'
  openId: string | null
  error: string | null
}

export function useFeishuAuth() {
  const [auth, setAuth] = useState<AuthState>({ status: 'idle', openId: null, error: null })

  // On mount, check if we're returning from OAuth redirect
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // Remove code from URL (clean up, keep hash)
      const hash = window.location.hash
      const cleanUrl = window.location.pathname + hash
      window.history.replaceState({}, '', cleanUrl)

      // Exchange code for open_id and store it
      exchangeCode(code).then((openId) => {
        if (openId) {
          sessionStorage.setItem('whisper_open_id', openId)
        }
      })
    }
  }, [])

  const authenticate = useCallback(async (roomId: string): Promise<boolean> => {
    // Check if room requires auth
    try {
      const roomResp = await fetch(`/api/rooms/${roomId}`)
      if (!roomResp.ok) return false
      const roomData = await roomResp.json()

      if (!roomData.restricted) {
        setAuth({ status: 'success', openId: null, error: null })
        return true
      }
    } catch {
      setAuth({ status: 'error', openId: null, error: '无法连接服务器' })
      return false
    }

    setAuth({ status: 'loading', openId: null, error: null })

    // Check if we already have an open_id from a previous OAuth
    let openId = sessionStorage.getItem('whisper_open_id')

    // Check URL for OAuth callback code
    if (!openId) {
      const params = new URLSearchParams(window.location.search)
      const code = params.get('code')
      if (code) {
        openId = await exchangeCode(code)
        if (openId) sessionStorage.setItem('whisper_open_id', openId)
      }
    }

    if (openId) {
      // Verify room access
      return await verifyAccess(roomId, openId)
    }

    // No open_id yet — redirect to Feishu OAuth
    // Save full room URL to sessionStorage (redirect will lose path + hash)
    sessionStorage.setItem('whisper_return_url', window.location.pathname + window.location.hash)

    const appId = await getAppId()
    if (!appId) {
      setAuth({ status: 'error', openId: null, error: '无法获取应用配置' })
      return false
    }

    // Use a fixed callback path so only one redirect URL needs to be configured in Feishu
    const callbackUrl = window.location.origin + '/auth/callback'
    const redirectUri = encodeURIComponent(callbackUrl)
    const oauthUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${redirectUri}&response_type=code&state=whisper`

    window.location.href = oauthUrl
    return false // page will redirect
  }, [])

  const verifyAccess = useCallback(async (roomId: string, openId: string): Promise<boolean> => {
    try {
      const resp = await fetch('/api/auth/verify-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, openId }),
      })
      if (resp.ok) {
        setAuth({ status: 'success', openId, error: null })
        return true
      }
      setAuth({ status: 'error', openId: null, error: '你不是该群的成员，无法进入' })
      return false
    } catch {
      setAuth({ status: 'error', openId: null, error: '验证请求失败' })
      return false
    }
  }, [])

  return { auth, authenticate }
}

async function exchangeCode(code: string): Promise<string | null> {
  try {
    const resp = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    if (resp.ok) {
      const data = await resp.json()
      return data.open_id || null
    }
  } catch {}
  return null
}

async function getAppId(): Promise<string | null> {
  try {
    const resp = await fetch('/api/auth/app-id')
    if (resp.ok) {
      const data = await resp.json()
      return data.appId || null
    }
  } catch {}
  return null
}
