import type { Message, MessageStatus } from '../domain/types'
import { MAX_MESSAGES_PER_CHAT, chatReducer, initialChatState, type ChatState } from './chatReducer'

const CHAT_ID = '10000000'

function message(overrides: Partial<Message> = {}): Message {
  return {
    id: 'm1',
    chatId: CHAT_ID,
    text: 'Привет',
    direction: 'incoming',
    timestamp: 1_000,
    ...overrides,
  }
}

function withOpenChat(): ChatState {
  return chatReducer(initialChatState, {
    type: 'chatOpened',
    chatId: CHAT_ID,
    phone: '79991234567',
    now: 500,
  })
}

describe('chatReducer', () => {
  it('opens a chat and makes it active', () => {
    const state = withOpenChat()
    expect(state.activeChatId).toBe(CHAT_ID)
    expect(state.chats[CHAT_ID]).toEqual({
      id: CHAT_ID,
      phone: '79991234567',
      unreadCount: 0,
      updatedAt: 500,
    })
  })

  it('creates an unknown chat on an incoming message and counts it as unread', () => {
    const state = chatReducer(initialChatState, {
      type: 'messageReceived',
      message: message(),
      chatName: 'Иван',
    })
    expect(state.chats[CHAT_ID]).toMatchObject({ name: 'Иван', unreadCount: 1, updatedAt: 1_000 })
    expect(state.messages[CHAT_ID]).toHaveLength(1)
  })

  it('does not count messages in the active chat as unread', () => {
    const state = chatReducer(withOpenChat(), { type: 'messageReceived', message: message() })
    expect(state.chats[CHAT_ID]?.unreadCount).toBe(0)
  })

  it('resets the unread counter when the chat is selected', () => {
    let state = chatReducer(initialChatState, { type: 'messageReceived', message: message() })
    state = chatReducer(state, { type: 'chatSelected', chatId: CHAT_ID })
    expect(state.chats[CHAT_ID]?.unreadCount).toBe(0)
  })

  it('ignores redelivered notifications', () => {
    const once = chatReducer(withOpenChat(), { type: 'messageReceived', message: message() })
    const twice = chatReducer(once, { type: 'messageReceived', message: message() })
    expect(twice).toBe(once)
  })

  it('keeps messages ordered by timestamp', () => {
    let state = withOpenChat()
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'b', timestamp: 2 }),
    })
    state = chatReducer(state, {
      type: 'messageReceived',
      message: message({ id: 'a', timestamp: 1 }),
    })
    expect(state.messages[CHAT_ID]?.map((item) => item.id)).toEqual(['a', 'b'])
  })

  it('caps the stored history per chat', () => {
    let state = withOpenChat()
    for (let index = 0; index <= MAX_MESSAGES_PER_CHAT; index += 1) {
      state = chatReducer(state, {
        type: 'messageReceived',
        message: message({ id: `m${index}`, timestamp: index }),
      })
    }
    expect(state.messages[CHAT_ID]).toHaveLength(MAX_MESSAGES_PER_CHAT)
    expect(state.messages[CHAT_ID]?.[0]?.id).toBe('m1')
  })

  describe('outgoing messages', () => {
    const pending = message({ id: 'local-1', direction: 'outgoing', status: 'pending' })

    it('replaces the local id with the server id once sent', () => {
      let state = chatReducer(withOpenChat(), { type: 'messageQueued', message: pending })
      state = chatReducer(state, {
        type: 'messageSent',
        chatId: CHAT_ID,
        localId: 'local-1',
        messageId: 'server-1',
      })
      expect(state.messages[CHAT_ID]).toEqual([{ ...pending, id: 'server-1', status: 'sent' }])
    })

    it('drops the local copy when the API webhook arrived before the HTTP response', () => {
      let state = chatReducer(withOpenChat(), { type: 'messageQueued', message: pending })
      state = chatReducer(state, {
        type: 'messageReceived',
        message: message({
          id: 'server-1',
          direction: 'outgoing',
          status: 'sent',
          timestamp: 1_001,
        }),
      })
      state = chatReducer(state, {
        type: 'messageSent',
        chatId: CHAT_ID,
        localId: 'local-1',
        messageId: 'server-1',
      })
      expect(state.messages[CHAT_ID]?.map((item) => item.id)).toEqual(['server-1'])
    })

    it('never downgrades a status', () => {
      let state = chatReducer(withOpenChat(), {
        type: 'messageReceived',
        message: message({ id: 'server-1', direction: 'outgoing', status: 'sent' }),
      })
      const update = (status: MessageStatus) =>
        chatReducer(state, {
          type: 'statusUpdated',
          chatId: CHAT_ID,
          messageId: 'server-1',
          status,
        })

      state = update('read')
      state = update('delivered')
      expect(state.messages[CHAT_ID]?.[0]?.status).toBe('read')
    })

    it('marks failures and allows a retry', () => {
      let state = chatReducer(withOpenChat(), { type: 'messageQueued', message: pending })
      state = chatReducer(state, { type: 'messageFailed', chatId: CHAT_ID, messageId: 'local-1' })
      expect(state.messages[CHAT_ID]?.[0]?.status).toBe('failed')

      state = chatReducer(state, { type: 'messageRetried', chatId: CHAT_ID, messageId: 'local-1' })
      expect(state.messages[CHAT_ID]?.[0]?.status).toBe('pending')
    })

    it('ignores statuses for unknown messages', () => {
      const state = withOpenChat()
      const next = chatReducer(state, {
        type: 'statusUpdated',
        chatId: CHAT_ID,
        messageId: 'missing',
        status: 'read',
      })
      expect(next).toBe(state)
    })
  })
})
