import { initialChatState, type ChatState } from './chatReducer'
import {
  clearCredentials,
  loadChatState,
  loadCredentials,
  saveChatState,
  saveCredentials,
} from './storage'

const credentials = { idInstance: '1', apiTokenInstance: 'token', apiUrl: 'https://example.com' }

describe('credentials storage', () => {
  it('round-trips credentials through sessionStorage', () => {
    saveCredentials(credentials)
    expect(loadCredentials()).toEqual(credentials)
    expect(localStorage.length).toBe(0)

    clearCredentials()
    expect(loadCredentials()).toBeNull()
  })

  it('ignores corrupted data', () => {
    sessionStorage.setItem('max-chat:credentials', '{"idInstance":1}')
    expect(loadCredentials()).toBeNull()
    sessionStorage.setItem('max-chat:credentials', 'not json')
    expect(loadCredentials()).toBeNull()
  })
})

describe('chat state storage', () => {
  const state: ChatState = {
    chats: { c1: { id: 'c1', unreadCount: 0, updatedAt: 1 } },
    messages: {
      c1: [
        { id: 'a', chatId: 'c1', text: 'hi', direction: 'outgoing', timestamp: 1, status: 'read' },
        {
          id: 'b',
          chatId: 'c1',
          text: 'yo',
          direction: 'outgoing',
          timestamp: 2,
          status: 'pending',
        },
      ],
    },
    activeChatId: 'c1',
  }

  it('restores chats per instance and marks in-flight messages as failed', () => {
    saveChatState('1', state)

    const restored = loadChatState('1')
    expect(restored.activeChatId).toBeNull()
    expect(restored.chats).toEqual(state.chats)
    expect(restored.messages.c1?.map((message) => message.status)).toEqual(['read', 'failed'])
    expect(loadChatState('2')).toBe(initialChatState)
  })

  it('falls back to an empty state for corrupted data', () => {
    localStorage.setItem('max-chat:v1:1', '{"chats":null}')
    expect(loadChatState('1')).toBe(initialChatState)
  })
})
