import { useCallback, useMemo, useState } from 'react'
import { createGreenApiClient } from '../api/greenApiClient'
import type { Credentials } from '../domain/types'
import { LoginPage } from '../features/auth/LoginPage'
import { ChatProvider } from '../store/ChatProvider'
import { clearCredentials, loadCredentials, saveCredentials } from '../store/storage'
import { ChatLayout } from './ChatLayout'

export function App() {
  const [credentials, setCredentials] = useState<Credentials | null>(loadCredentials)
  const client = useMemo(() => credentials && createGreenApiClient(credentials), [credentials])

  const handleLogin = useCallback((next: Credentials) => {
    saveCredentials(next)
    setCredentials(next)
  }, [])

  const handleLogout = useCallback(() => {
    clearCredentials()
    setCredentials(null)
  }, [])

  if (!credentials || !client) {
    return <LoginPage onLogin={handleLogin} />
  }

  return (
    <ChatProvider key={credentials.idInstance} client={client} idInstance={credentials.idInstance}>
      <ChatLayout idInstance={credentials.idInstance} onLogout={handleLogout} />
    </ChatProvider>
  )
}
