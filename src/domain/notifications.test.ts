import { incomingTextWebhook, statusWebhook } from '../test/fixtures'
import { parseNotification } from './notifications'

describe('parseNotification', () => {
  it('maps an incoming text message', () => {
    expect(parseNotification(incomingTextWebhook())).toEqual({
      type: 'message',
      chatName: 'Ваня',
      phone: '79876543210',
      message: {
        id: 'incoming-1',
        chatId: '10000000',
        text: 'Привет!',
        direction: 'incoming',
        timestamp: 1_763_115_112_000,
      },
    })
  })

  it('reads text from extended text messages', () => {
    const event = parseNotification(
      incomingTextWebhook({
        messageData: {
          typeMessage: 'extendedTextMessage',
          extendedTextMessageData: { text: 'https://green-api.com' },
        },
      }),
    )
    expect(event).toMatchObject({ message: { text: 'https://green-api.com' } })
  })

  it('maps a message sent from the phone as outgoing and keeps the peer name', () => {
    const event = parseNotification(
      incomingTextWebhook({
        typeWebhook: 'outgoingMessageReceived',
        senderData: { chatId: '10000000', chatName: 'Иван Петров', senderName: 'Я' },
      }),
    )
    expect(event).toMatchObject({
      chatName: 'Иван Петров',
      message: { direction: 'outgoing', status: 'sent' },
    })
    expect(event).not.toHaveProperty('phone')
  })

  it('uses the group name rather than the sender name for group chats', () => {
    const event = parseNotification(
      incomingTextWebhook({
        senderData: {
          chatId: '-100500',
          chatName: 'Команда',
          senderName: 'Иван',
          senderContactName: 'Ваня',
          senderPhoneNumber: 79876543210,
        },
      }),
    )
    expect(event).toMatchObject({ chatName: 'Команда' })
    expect(event).not.toHaveProperty('phone')
  })

  it('ignores non-text messages', () => {
    const event = parseNotification(
      incomingTextWebhook({ messageData: { typeMessage: 'imageMessage' } }),
    )
    expect(event).toBeNull()
  })

  it('maps outgoing message statuses', () => {
    expect(parseNotification(statusWebhook({ status: 'read' }))).toEqual({
      type: 'status',
      chatId: '10000000',
      messageId: 'server-1',
      status: 'read',
    })
  })

  it('treats delivery problems as failures', () => {
    expect(parseNotification(statusWebhook({ status: 'noAccount' }))).toMatchObject({
      status: 'failed',
    })
  })

  it('ignores service and malformed notifications', () => {
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged', timestamp: 1 })).toBeNull()
    expect(parseNotification({ typeWebhook: 'incomingMessageReceived', timestamp: 1 })).toBeNull()
  })
})
