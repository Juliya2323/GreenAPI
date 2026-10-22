export type InstanceState =
  'authorized' | 'notAuthorized' | 'blocked' | 'sleepMode' | 'starting' | 'yellowCard'

export interface StateInstanceResponse {
  stateInstance: InstanceState
}

export interface CheckAccountResponse {
  exist: boolean
  chatId: string
}

export interface SendMessageRequest {
  chatId: string
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

export interface DeleteNotificationResponse {
  result: boolean
  reason?: string
}

export interface SenderData {
  chatId: string
  chatName?: string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

interface WebhookBase {
  timestamp: number
}

export interface MessageWebhook extends WebhookBase {
  typeWebhook: 'incomingMessageReceived' | 'outgoingMessageReceived' | 'outgoingAPIMessageReceived'
  idMessage: string
  senderData: SenderData
  messageData: MessageData
}

export type OutgoingStatus = 'sent' | 'delivered' | 'read' | 'failed' | 'noAccount' | 'notInGroup'

export interface OutgoingMessageStatusWebhook extends WebhookBase {
  typeWebhook: 'outgoingMessageStatus'
  idMessage: string
  chatId: string
  status: OutgoingStatus
}

export interface UnknownWebhook extends WebhookBase {
  typeWebhook: string
}

export type NotificationBody = MessageWebhook | OutgoingMessageStatusWebhook | UnknownWebhook

export interface Notification {
  receiptId: number
  body: NotificationBody
}
