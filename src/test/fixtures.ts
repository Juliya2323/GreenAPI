import type { MessageWebhook, OutgoingMessageStatusWebhook } from '../api/types'

export function incomingTextWebhook(overrides: Partial<MessageWebhook> = {}): MessageWebhook {
  return {
    typeWebhook: 'incomingMessageReceived',
    timestamp: 1_763_115_112,
    idMessage: 'incoming-1',
    senderData: {
      chatId: '10000000',
      chatName: 'Иван Петров',
      sender: '10000000',
      senderName: 'Иван Петров',
      senderContactName: 'Ваня',
      senderPhoneNumber: 79876543210,
    },
    messageData: {
      typeMessage: 'textMessage',
      textMessageData: { textMessage: 'Привет!' },
    },
    ...overrides,
  }
}

export function statusWebhook(
  overrides: Partial<OutgoingMessageStatusWebhook> = {},
): OutgoingMessageStatusWebhook {
  return {
    typeWebhook: 'outgoingMessageStatus',
    timestamp: 1_763_115_200,
    idMessage: 'server-1',
    chatId: '10000000',
    status: 'delivered',
    ...overrides,
  }
}
