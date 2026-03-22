import { useState } from 'react'
import { ChatRoom } from './chat/ChatRoom'
import { JoinRoom } from './components/JoinRoom'
import { CreateRoom } from './components/CreateRoom'

function getRouteInfo() {
  const path = window.location.pathname
  const match = path.match(/^\/r\/([a-zA-Z0-9_-]+)/)
  if (match) {
    return { page: 'room' as const, roomId: match[1] }
  }
  return { page: 'home' as const, roomId: '' }
}

export default function App() {
  const { page, roomId } = getRouteInfo()
  const [nickname, setNickname] = useState<string | null>(null)

  if (page === 'home') {
    return <CreateRoom />
  }

  // Room page — show join screen or chat
  if (!nickname) {
    return <JoinRoom roomId={roomId} onJoin={setNickname} />
  }

  return <ChatRoom roomId={roomId} nickname={nickname} />
}
