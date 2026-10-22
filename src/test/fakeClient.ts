import type { GreenApiClient } from '../api/greenApiClient'
import type { Notification, NotificationBody } from '../api/types'

/** In-memory GREEN-API double whose notification queue is fed by the test. */
export function createFakeClient() {
  const queue: Notification[] = []
  let wakeReceiver: (() => void) | null = null
  let nextReceiptId = 1

  const client = {
    getStateInstance: vi.fn<GreenApiClient['getStateInstance']>(() =>
      Promise.resolve({ stateInstance: 'authorized' }),
    ),
    checkAccount: vi.fn<GreenApiClient['checkAccount']>(() =>
      Promise.resolve({ exist: true, chatId: '10000000' }),
    ),
    sendMessage: vi.fn<GreenApiClient['sendMessage']>(() =>
      Promise.resolve({ idMessage: 'server-1' }),
    ),
    receiveNotification: vi.fn<GreenApiClient['receiveNotification']>(
      (_timeout, signal) =>
        new Promise((resolve, reject) => {
          const deliver = () => {
            const next = queue.shift()
            if (!next) return false
            wakeReceiver = null
            resolve(next)
            return true
          }
          if (deliver()) return
          wakeReceiver = deliver
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true })
        }),
    ),
    deleteNotification: vi.fn<GreenApiClient['deleteNotification']>(() =>
      Promise.resolve({ result: true }),
    ),
  } satisfies GreenApiClient

  return {
    client,
    push(body: NotificationBody) {
      queue.push({ receiptId: nextReceiptId++, body })
      wakeReceiver?.()
    },
  }
}
