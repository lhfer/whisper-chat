import { useState } from 'react'
import { ChatRoom } from './chat/ChatRoom'
import { JoinRoom } from './components/JoinRoom'
import { CreateRoom } from './components/CreateRoom'
import { AuthCallback } from './components/AuthCallback'

function getRouteInfo() {
  const path = window.location.pathname
  if (path === '/auth/callback') {
    return { page: 'auth_callback' as const, roomId: '' }
  }
  const match = path.match(/^\/r\/([a-zA-Z0-9_-]+)/)
  if (match) {
    return { page: 'room' as const, roomId: match[1] }
  }
  return { page: 'home' as const, roomId: '' }
}

export default function App() {
  const { page, roomId } = getRouteInfo()
  const [nickname, setNickname] = useState<string | null>(null)

  if (page === 'auth_callback') {
    return <AuthCallback />
  }

  if (page === 'home') {
    return <CreateRoom />
  }

  if (!nickname) {
    return <JoinRoom roomId={roomId} onJoin={setNickname} />
  }

  return <ChatRoom roomId={roomId} nickname={nickname} />
}
