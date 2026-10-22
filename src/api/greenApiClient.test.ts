import { GreenApiError } from './errors'
import { createGreenApiClient, deriveApiUrl } from './greenApiClient'

const credentials = {
  idInstance: '3100123456',
  apiTokenInstance: 'secret-token',
  apiUrl: 'https://3100.api.green-api.com/',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? '' : JSON.stringify(body), { status })
}

function setup(response: Response | Error) {
  const fetchMock = vi.fn<typeof fetch>(() =>
    response instanceof Error ? Promise.reject(response) : Promise.resolve(response),
  )
  return { fetchMock, client: createGreenApiClient(credentials, fetchMock) }
}

function lastCall(fetchMock: ReturnType<typeof setup>['fetchMock']) {
  const [url, init] = fetchMock.mock.calls.at(-1) ?? []
  return { url: String(url), init }
}

describe('deriveApiUrl', () => {
  it('uses the instance prefix as the host', () => {
    expect(deriveApiUrl('3100123456')).toBe('https://3100.api.green-api.com')
  })

  it('falls back to the shared host for short ids', () => {
    expect(deriveApiUrl('12')).toBe('https://api.green-api.com')
  })
})

describe('createGreenApiClient', () => {
  it('sends a text message', async () => {
    const { client, fetchMock } = setup(jsonResponse({ idMessage: 'server-1' }))

    await expect(client.sendMessage({ chatId: '10000000', message: 'Привет' })).resolves.toEqual({
      idMessage: 'server-1',
    })

    const { url, init } = lastCall(fetchMock)
    expect(url).toBe('https://3100.api.green-api.com/waInstance3100123456/sendMessage/secret-token')
    expect(init?.method).toBe('POST')
    expect(JSON.parse(String(init?.body))).toEqual({ chatId: '10000000', message: 'Привет' })
  })

  it('passes receiveTimeout to receiveNotification and maps an empty queue to null', async () => {
    const { client, fetchMock } = setup(jsonResponse(null))

    await expect(client.receiveNotification(20)).resolves.toBeNull()
    expect(lastCall(fetchMock).url).toBe(
      'https://3100.api.green-api.com/waInstance3100123456/receiveNotification/secret-token?receiveTimeout=20',
    )
  })

  it('deletes a notification by receipt id', async () => {
    const { client, fetchMock } = setup(jsonResponse({ result: true }))

    await client.deleteNotification(42)
    const { url, init } = lastCall(fetchMock)
    expect(url).toMatch(/\/deleteNotification\/secret-token\/42$/)
    expect(init?.method).toBe('DELETE')
  })

  it('sends the phone number to checkAccount as a number', async () => {
    const { client, fetchMock } = setup(jsonResponse({ exist: true, chatId: '10000000' }))

    await expect(client.checkAccount('79991234567')).resolves.toMatchObject({ chatId: '10000000' })
    expect(JSON.parse(String(lastCall(fetchMock).init?.body))).toEqual({ phoneNumber: 79991234567 })
  })

  it('surfaces the reason when checkAccount cannot run', async () => {
    const { client } = setup(
      jsonResponse({ status: false, reason: 'instance is starting or not authorized' }),
    )
    await expect(client.checkAccount('79991234567')).rejects.toThrow(
      'instance is starting or not authorized',
    )
  })

  it('maps 401 to an unauthorized error', async () => {
    const { client } = setup(jsonResponse(undefined, 401))

    const error = await client.getStateInstance().catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error).toMatchObject({ kind: 'unauthorized', status: 401 })
  })

  it('includes the server message for other HTTP errors', async () => {
    const { client } = setup(
      new Response('Message cannot be received because custom webhook url is set', {
        status: 400,
      }),
    )
    await expect(client.receiveNotification(5)).rejects.toThrow(/custom webhook url is set/)
  })

  it('maps fetch failures to a network error', async () => {
    const { client } = setup(new TypeError('Failed to fetch'))
    await expect(client.getStateInstance()).rejects.toMatchObject({ kind: 'network' })
  })

  it('propagates caller aborts', async () => {
    const controller = new AbortController()
    const fetchMock = vi.fn<typeof fetch>(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('', 'AbortError')))
        }),
    )
    const client = createGreenApiClient(credentials, fetchMock)
    const reason = new Error('stopped')

    const pending = client.receiveNotification(5, controller.signal)
    controller.abort(reason)
    await expect(pending).rejects.toBe(reason)
  })
})
