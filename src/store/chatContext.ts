import { createContext, useContext } from 'react'
import type { ConnectionStatus } from '../api/notificationPoller'
import type { ChatState } from './chatReducer'

export interface ChatActions {
  /** Validates the phone, resolves its MAX `chatId` and opens the chat. Throws with a user-facing message. */
  openChatByPhone(phoneInput: string): Promise<void>
  selectChat(chatId: string | null): void
  sendMessage(chatId: string, text: string): void
  retryMessage(chatId: string, messageId: string): void
}

export interface ConnectionState {
  status: ConnectionStatus
  error: string | null
}

export const ChatStateContext = createContext<ChatState | null>(null)
export const ChatActionsContext = createContext<ChatActions | null>(null)
export const ConnectionContext = createContext<ConnectionState | null>(null)

function useRequiredContext<T>(context: React.Context<T | null>, name: string): T {
  const value = useContext(context)
  if (value === null) throw new Error(`${name} must be used within <ChatProvider>`)
  return value
}

export const useChatState = () => useRequiredContext(ChatStateContext, 'useChatState')
export const useChatActions = () => useRequiredContext(ChatActionsContext, 'useChatActions')
export const useConnection = () => useRequiredContext(ConnectionContext, 'useConnection')
