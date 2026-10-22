import type {
  MessageData,
  MessageWebhook,
  NotificationBody,
  OutgoingMessageStatusWebhook,
} from '../api/types'
import type { Message, MessageStatus } from './types'

export interface MessageEvent {
  type: 'message'
  message: Message
  chatName?: string
  phone?: string
}

export interface StatusEvent {
  type: 'status'
  chatId: string
  messageId: string
  status: MessageStatus
}

export type ChatEvent = MessageEvent | StatusEvent

const MESSAGE_WEBHOOKS = new Set<string>([
  'incomingMessageReceived',
  'outgoingMessageReceived',
  'outgoingAPIMessageReceived',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isMessageWebhook(body: NotificationBody): body is MessageWebhook {
  const candidate: Record<string, unknown> = { ...body }
  return (
    MESSAGE_WEBHOOKS.has(body.typeWebhook) &&
    typeof candidate.idMessage === 'string' &&
    isRecord(candidate.senderData) &&
    typeof candidate.senderData.chatId === 'string' &&
    isRecord(candidate.messageData)
  )
}

function isStatusWebhook(body: NotificationBody): body is OutgoingMessageStatusWebhook {
  const candidate: Record<string, unknown> = { ...body }
  return (
    body.typeWebhook === 'outgoingMessageStatus' &&
    typeof candidate.idMessage === 'string' &&
    typeof candidate.chatId === 'string' &&
    typeof candidate.status === 'string'
  )
}

/** Only text messages are supported; any other content type yields `null`. */
export function extractText(messageData: MessageData): string | null {
  switch (messageData.typeMessage) {
    case 'textMessage':
      return messageData.textMessageData?.textMessage ?? null
    case 'extendedTextMessage':
    case 'quotedMessage':
      return messageData.extendedTextMessageData?.text ?? null
    default:
      return null
  }
}

function toMessageStatus(status: OutgoingMessageStatusWebhook['status']): MessageStatus {
  switch (status) {
    case 'sent':
    case 'delivered':
    case 'read':
      return status
    default:
      return 'failed'
  }
}

export function isGroupChatId(chatId: string): boolean {
  return chatId.startsWith('-')
}

function nonEmpty(...values: (string | undefined)[]): string | undefined {
  return values.find((value) => value !== undefined && value.trim() !== '')
}

function parseMessageWebhook(body: MessageWebhook): MessageEvent | null {
  const text = extractText(body.messageData)
  if (text === null) return null

  const { senderData } = body
  const isIncoming = body.typeWebhook === 'incomingMessageReceived'
  const event: MessageEvent = {
    type: 'message',
    message: {
      id: body.idMessage,
      chatId: senderData.chatId,
      text,
      direction: isIncoming ? 'incoming' : 'outgoing',
      timestamp: body.timestamp * 1000,
      ...(isIncoming ? {} : { status: 'sent' as const }),
    },
  }

  // In outgoing webhooks and group chats the sender is not the peer, so only the chat name describes it.
  const isPersonalIncoming = isIncoming && !isGroupChatId(senderData.chatId)
  const chatName = isPersonalIncoming
    ? nonEmpty(senderData.senderContactName, senderData.chatName, senderData.senderName)
    : nonEmpty(senderData.chatName)
  if (chatName) event.chatName = chatName
  if (isPersonalIncoming && senderData.senderPhoneNumber) {
    event.phone = String(senderData.senderPhoneNumber)
  }
  return event
}

export function parseNotification(body: NotificationBody): ChatEvent | null {
  if (isMessageWebhook(body)) {
    return parseMessageWebhook(body)
  }
  if (isStatusWebhook(body)) {
    return {
      type: 'status',
      chatId: body.chatId,
      messageId: body.idMessage,
      status: toMessageStatus(body.status),
    }
  }
  return null
}
