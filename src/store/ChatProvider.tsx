import { useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react'
import { getErrorMessage } from '../api/errors'
import type { GreenApiClient } from '../api/greenApiClient'
import { runNotificationPoller } from '../api/notificationPoller'
import type { NotificationBody } from '../api/types'
import { parseNotification } from '../domain/notifications'
import { isValidPhone, normalizePhone } from '../domain/phone'
import { MAX_MESSAGE_LENGTH } from '../domain/types'
import { chatReducer, type ChatState } from './chatReducer'
import {
  ChatActionsContext,
  ChatStateContext,
  ConnectionContext,
  type ChatActions,
  type ConnectionState,
} from './chatContext'
import { loadChatState, saveChatState } from './storage'

interface ChatProviderProps {
  client: GreenApiClient
  idInstance: string
  children: ReactNode
  /** Disables the receive loop; useful for isolated UI tests. */
  pollNotifications?: boolean
}

function createLocalId(): string {
  const random =
    typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `local-${random}`
}

export function ChatProvider({
  client,
  idInstance,
  children,
  pollNotifications = true,
}: ChatProviderProps) {
  const [state, dispatch] = useReducer(chatReducer, idInstance, loadChatState)
  const [connection, setConnection] = useState<ConnectionState>({
    status: 'connecting',
    error: null,
  })

  const stateRef = useRef<ChatState>(state)
  useEffect(() => {
    stateRef.current = state
    saveChatState(idInstance, state)
  }, [idInstance, state])

  useEffect(() => {
    if (!pollNotifications) return
    const controller = new AbortController()

    const handleNotification = (body: NotificationBody) => {
      const event = parseNotification(body)
      if (!event) return
      if (event.type === 'message') {
        dispatch({
          type: 'messageReceived',
          message: event.message,
          ...(event.chatName ? { chatName: event.chatName } : {}),
          ...(event.phone ? { phone: event.phone } : {}),
        })
      } else {
        dispatch({
          type: 'statusUpdated',
          chatId: event.chatId,
          messageId: event.messageId,
          status: event.status,
        })
      }
    }

    void runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: handleNotification,
      onStatusChange: (status, error) =>
        setConnection({ status, error: error === undefined ? null : getErrorMessage(error) }),
    })

    return () => controller.abort()
  }, [client, pollNotifications])

  const actions = useMemo<ChatActions>(() => {
    const deliver = (chatId: string, messageId: string, text: string) => {
      client
        .sendMessage({ chatId, message: text })
        .then(({ idMessage }) =>
          dispatch({ type: 'messageSent', chatId, localId: messageId, messageId: idMessage }),
        )
        .catch((error: unknown) => {
          console.error('Failed to send message', error)
          dispatch({ type: 'messageFailed', chatId, messageId })
        })
    }

    return {
      async openChatByPhone(phoneInput) {
        const phone = normalizePhone(phoneInput)
        if (!isValidPhone(phone)) {
          throw new Error('Введите номер РФ (+7, 11 цифр) или РБ (+375, 12 цифр)')
        }

        const known = Object.values(stateRef.current.chats).find((chat) => chat.phone === phone)
        if (known) {
          dispatch({ type: 'chatSelected', chatId: known.id })
          return
        }

        // Replies arrive with a numeric `chatId`, so it must be resolved up front to match them.
        const account = await client.checkAccount(phone)
        if (!account.exist || !account.chatId) {
          throw new Error('У этого номера нет аккаунта MAX')
        }
        dispatch({ type: 'chatOpened', chatId: account.chatId, phone, now: Date.now() })
      },

      selectChat(chatId) {
        dispatch({ type: 'chatSelected', chatId })
      },

      sendMessage(chatId, rawText) {
        const text = rawText.trim()
        if (!text || text.length > MAX_MESSAGE_LENGTH) return

        const id = createLocalId()
        dispatch({
          type: 'messageQueued',
          message: {
            id,
            chatId,
            text,
            direction: 'outgoing',
            timestamp: Date.now(),
            status: 'pending',
          },
        })
        deliver(chatId, id, text)
      },

      retryMessage(chatId, messageId) {
        const message = stateRef.current.messages[chatId]?.find((item) => item.id === messageId)
        if (message?.status !== 'failed') return
        dispatch({ type: 'messageRetried', chatId, messageId })
        deliver(chatId, messageId, message.text)
      },
    }
  }, [client])

  return (
    <ChatActionsContext value={actions}>
      <ConnectionContext value={connection}>
        <ChatStateContext value={state}>{children}</ChatStateContext>
      </ConnectionContext>
    </ChatActionsContext>
  )
}
