import type { Credentials, Message } from '../domain/types'
import { initialChatState, type ChatState } from './chatReducer'

const CREDENTIALS_KEY = 'max-chat:credentials'
const CHAT_STATE_VERSION = 1

const chatStateKey = (idInstance: string) => `max-chat:v${CHAT_STATE_VERSION}:${idInstance}`

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch (error) {
    // Quota errors or disabled storage must not break the chat itself.
    console.warn(`Failed to persist "${key}"`, error)
  }
}

function isCredentials(value: unknown): value is Credentials {
  if (typeof value !== 'object' || value === null) return false
  const { idInstance, apiTokenInstance, apiUrl } = value as Record<string, unknown>
  return (
    typeof idInstance === 'string' &&
    typeof apiTokenInstance === 'string' &&
    typeof apiUrl === 'string'
  )
}

/**
 * The API token is kept in `sessionStorage`: it survives page reloads but is wiped with the tab,
 * which limits exposure on shared machines.
 */
export function loadCredentials(): Credentials | null {
  const value = readJson(sessionStorage, CREDENTIALS_KEY)
  return isCredentials(value) ? value : null
}

export function saveCredentials(credentials: Credentials): void {
  writeJson(sessionStorage, CREDENTIALS_KEY, credentials)
}

export function clearCredentials(): void {
  sessionStorage.removeItem(CREDENTIALS_KEY)
}

/** A request that was in flight when the page closed will never resolve, so it counts as failed. */
function settleInFlight(message: Message): Message {
  return message.status === 'pending' ? { ...message, status: 'failed' } : message
}

export function loadChatState(idInstance: string): ChatState {
  const value = readJson(localStorage, chatStateKey(idInstance))
  if (typeof value !== 'object' || value === null) return initialChatState

  const { chats, messages } = value as Partial<ChatState>
  if (typeof chats !== 'object' || chats === null) return initialChatState
  if (typeof messages !== 'object' || messages === null) return initialChatState

  return {
    chats,
    messages: Object.fromEntries(
      Object.entries(messages).map(([chatId, list]) => [
        chatId,
        Array.isArray(list) ? list.map(settleInFlight) : [],
      ]),
    ),
    activeChatId: null,
  }
}

export function saveChatState(idInstance: string, state: ChatState): void {
  writeJson(localStorage, chatStateKey(idInstance), {
    chats: state.chats,
    messages: state.messages,
  })
}
