import type { Chat, Message, MessageStatus } from '../domain/types'

export interface ChatState {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  activeChatId: string | null
}

export const MAX_MESSAGES_PER_CHAT = 500

export const initialChatState: ChatState = { chats: {}, messages: {}, activeChatId: null }

export type ChatAction =
  | { type: 'chatOpened'; chatId: string; phone?: string; now: number }
  | { type: 'chatSelected'; chatId: string | null }
  | { type: 'messageReceived'; message: Message; chatName?: string; phone?: string }
  | { type: 'messageQueued'; message: Message }
  | { type: 'messageSent'; chatId: string; localId: string; messageId: string }
  | { type: 'messageFailed'; chatId: string; messageId: string }
  | { type: 'messageRetried'; chatId: string; messageId: string }
  | { type: 'statusUpdated'; chatId: string; messageId: string; status: MessageStatus }

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/** Webhooks may arrive out of order, so a status is never downgraded (e.g. `read` → `delivered`). */
function mergeStatus(current: MessageStatus | undefined, next: MessageStatus): MessageStatus {
  if (current === undefined || current === 'failed') return next
  return STATUS_RANK[next] > STATUS_RANK[current] ? next : current
}

function upsertChat(state: ChatState, chatId: string, patch: Partial<Chat>): Record<string, Chat> {
  const existing = state.chats[chatId]
  const base: Chat = existing ?? { id: chatId, unreadCount: 0, updatedAt: 0 }
  return { ...state.chats, [chatId]: { ...base, ...patch } }
}

function insertMessage(list: readonly Message[], message: Message): Message[] {
  const next = [...list]
  let index = next.length
  while (index > 0 && (next[index - 1]?.timestamp ?? 0) > message.timestamp) index -= 1
  next.splice(index, 0, message)
  return next.length > MAX_MESSAGES_PER_CHAT ? next.slice(-MAX_MESSAGES_PER_CHAT) : next
}

function updateMessage(
  state: ChatState,
  chatId: string,
  messageId: string,
  update: (message: Message) => Message,
): ChatState {
  const list = state.messages[chatId]
  if (!list?.some((message) => message.id === messageId)) return state
  return {
    ...state,
    messages: {
      ...state.messages,
      [chatId]: list.map((message) => (message.id === messageId ? update(message) : message)),
    },
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'chatOpened': {
      const existing = state.chats[action.chatId]
      return {
        ...state,
        chats: upsertChat(state, action.chatId, {
          ...(action.phone ? { phone: action.phone } : {}),
          updatedAt: existing?.updatedAt || action.now,
          unreadCount: 0,
        }),
        activeChatId: action.chatId,
      }
    }

    case 'chatSelected': {
      if (action.chatId === null || !state.chats[action.chatId]) {
        return { ...state, activeChatId: null }
      }
      return {
        ...state,
        chats: upsertChat(state, action.chatId, { unreadCount: 0 }),
        activeChatId: action.chatId,
      }
    }

    case 'messageReceived': {
      const { message } = action
      const list = state.messages[message.chatId] ?? []
      if (list.some((item) => item.id === message.id)) return state

      const chat = state.chats[message.chatId]
      const isUnread = message.direction === 'incoming' && state.activeChatId !== message.chatId
      return {
        ...state,
        chats: upsertChat(state, message.chatId, {
          ...(action.chatName ? { name: action.chatName } : {}),
          ...(action.phone && !chat?.phone ? { phone: action.phone } : {}),
          updatedAt: Math.max(chat?.updatedAt ?? 0, message.timestamp),
          unreadCount: (chat?.unreadCount ?? 0) + (isUnread ? 1 : 0),
        }),
        messages: { ...state.messages, [message.chatId]: insertMessage(list, message) },
      }
    }

    case 'messageQueued': {
      const { message } = action
      const chat = state.chats[message.chatId]
      return {
        ...state,
        chats: upsertChat(state, message.chatId, {
          updatedAt: Math.max(chat?.updatedAt ?? 0, message.timestamp),
        }),
        messages: {
          ...state.messages,
          [message.chatId]: insertMessage(state.messages[message.chatId] ?? [], message),
        },
      }
    }

    case 'messageSent': {
      const list = state.messages[action.chatId] ?? []
      // The `outgoingAPIMessageReceived` webhook can outrun the HTTP response; keep a single copy.
      if (list.some((message) => message.id === action.messageId)) {
        return {
          ...state,
          messages: {
            ...state.messages,
            [action.chatId]: list.filter((message) => message.id !== action.localId),
          },
        }
      }
      return updateMessage(state, action.chatId, action.localId, (message) => ({
        ...message,
        id: action.messageId,
        status: 'sent',
      }))
    }

    case 'messageRetried':
      return updateMessage(state, action.chatId, action.messageId, (message) => ({
        ...message,
        status: 'pending',
      }))

    case 'messageFailed':
      return updateMessage(state, action.chatId, action.messageId, (message) => ({
        ...message,
        status: 'failed',
      }))

    case 'statusUpdated':
      return updateMessage(state, action.chatId, action.messageId, (message) => ({
        ...message,
        status: action.status === 'failed' ? 'failed' : mergeStatus(message.status, action.status),
      }))
  }
}
