/** SendMessage rejects longer texts. */
export const MAX_MESSAGE_LENGTH = 4000

export interface Credentials {
  idInstance: string
  apiTokenInstance: string
  apiUrl: string
}

export type MessageDirection = 'incoming' | 'outgoing'

/**
 * `pending` and `failed` are local states; the rest mirror GREEN-API `outgoingMessageStatus`.
 */
export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface Message {
  id: string
  chatId: string
  text: string
  direction: MessageDirection
  /** Unix time in milliseconds. */
  timestamp: number
  status?: MessageStatus
}

export interface Chat {
  /** MAX chat identifier (`chatId` in GREEN-API terms). */
  id: string
  /** Normalized phone number, digits only. */
  phone?: string
  name?: string
  unreadCount: number
  /** Unix time in milliseconds of the last activity, used for ordering. */
  updatedAt: number
}
