import { incomingTextWebhook } from '../test/fixtures'
import type { GreenApiClient } from './greenApiClient'
import { runNotificationPoller, type PollerOptions } from './notificationPoller'
import type { Notification } from './types'

function createClient(responses: (Notification | null | Error)[], controller: AbortController) {
  const receiveNotification = vi.fn<GreenApiClient['receiveNotification']>(() => {
    const next = responses.shift()
    if (next === undefined) {
      controller.abort()
      return Promise.reject(new Error('aborted'))
    }
    return next instanceof Error ? Promise.reject(next) : Promise.resolve(next)
  })
  const deleteNotification = vi.fn<GreenApiClient['deleteNotification']>(() =>
    Promise.resolve({ result: true }),
  )
  const client: GreenApiClient = {
    receiveNotification,
    deleteNotification,
    getStateInstance: vi.fn<GreenApiClient['getStateInstance']>(),
    checkAccount: vi.fn<GreenApiClient['checkAccount']>(),
    sendMessage: vi.fn<GreenApiClient['sendMessage']>(),
  }
  return { client, receiveNotification, deleteNotification }
}

describe('runNotificationPoller', () => {
  it('handles and acknowledges every notification in order', async () => {
    const controller = new AbortController()
    const first = { receiptId: 1, body: incomingTextWebhook({ idMessage: 'a' }) }
    const second = { receiptId: 2, body: { typeWebhook: 'stateInstanceChanged', timestamp: 1 } }
    const { client, deleteNotification } = createClient([first, null, second], controller)
    const onNotification = vi.fn<PollerOptions['onNotification']>()
    const onStatusChange = vi.fn<PollerOptions['onStatusChange']>()

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification,
      onStatusChange,
    })

    expect(onNotification.mock.calls).toEqual([[first.body], [second.body]])
    expect(deleteNotification.mock.calls.map(([receiptId]) => receiptId)).toEqual([1, 2])
    expect(onStatusChange.mock.calls).toEqual([
      ['connecting', undefined],
      ['online', undefined],
    ])
  })

  it('still acknowledges a notification when its handler throws', async () => {
    const controller = new AbortController()
    const { client, deleteNotification } = createClient(
      [{ receiptId: 7, body: incomingTextWebhook() }],
      controller,
    )
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: () => {
        throw new Error('boom')
      },
      onStatusChange: vi.fn<PollerOptions['onStatusChange']>(),
    })

    expect(deleteNotification).toHaveBeenCalledWith(7, controller.signal)
  })

  it('reports errors and recovers after a retry', async () => {
    const controller = new AbortController()
    const failure = new Error('Нет соединения')
    const { client, receiveNotification } = createClient([failure, null], controller)
    const onStatusChange = vi.fn<PollerOptions['onStatusChange']>()

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: vi.fn<PollerOptions['onNotification']>(),
      onStatusChange,
      retryDelaysMs: [0],
    })

    expect(receiveNotification).toHaveBeenCalledTimes(3)
    expect(onStatusChange.mock.calls).toEqual([
      ['connecting', undefined],
      ['error', failure],
      ['online', undefined],
    ])
  })
})
