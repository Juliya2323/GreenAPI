import type { GreenApiClient } from './greenApiClient'
import type { NotificationBody } from './types'

export type ConnectionStatus = 'connecting' | 'online' | 'error'

export interface PollerOptions {
  client: GreenApiClient
  signal: AbortSignal
  onNotification: (body: NotificationBody) => void
  onStatusChange: (status: ConnectionStatus, error?: unknown) => void
  /** Long-poll window, GREEN-API accepts 5–60 seconds. */
  receiveTimeoutSec?: number
  retryDelaysMs?: readonly number[]
}

const DEFAULT_RECEIVE_TIMEOUT_SEC = 20
const DEFAULT_RETRY_DELAYS_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(done, ms)
    signal.addEventListener('abort', done, { once: true })
    function done() {
      clearTimeout(timer)
      signal.removeEventListener('abort', done)
      resolve()
    }
  })
}

/**
 * Runs the HTTP API receive loop until `signal` is aborted.
 *
 * Notifications are acknowledged even when they are irrelevant to the chat UI, otherwise the
 * FIFO queue would stall on them. Handlers must be idempotent: if the delete call fails, the
 * same notification is delivered again.
 */
export async function runNotificationPoller({
  client,
  signal,
  onNotification,
  onStatusChange,
  receiveTimeoutSec = DEFAULT_RECEIVE_TIMEOUT_SEC,
  retryDelaysMs = DEFAULT_RETRY_DELAYS_MS,
}: PollerOptions): Promise<void> {
  let failures = 0
  let status: ConnectionStatus | undefined

  const setStatus = (next: ConnectionStatus, error?: unknown) => {
    if (next !== status || error !== undefined) onStatusChange(next, error)
    status = next
  }

  setStatus('connecting')

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(receiveTimeoutSec, signal)
      failures = 0
      setStatus('online')
      if (!notification) continue

      try {
        onNotification(notification.body)
      } catch (error) {
        console.error('Failed to handle GREEN-API notification', error)
      }
      await client.deleteNotification(notification.receiptId, signal)
    } catch (error) {
      if (signal.aborted) return
      setStatus('error', error)
      const delay = retryDelaysMs[Math.min(failures, retryDelaysMs.length - 1)] ?? 0
      failures += 1
      await sleep(delay, signal)
    }
  }
}
