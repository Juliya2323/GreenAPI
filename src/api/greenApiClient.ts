import type { Credentials } from '../domain/types'
import { GreenApiError, errorFromResponse } from './errors'
import type {
  CheckAccountResponse,
  DeleteNotificationResponse,
  Notification,
  SendMessageRequest,
  SendMessageResponse,
  StateInstanceResponse,
} from './types'

const DEFAULT_TIMEOUT_MS = 15_000
/** Extra time on top of `receiveTimeout` so the server always answers before the client gives up. */
const LONG_POLL_GRACE_MS = 10_000

export interface GreenApiClient {
  getStateInstance(signal?: AbortSignal): Promise<StateInstanceResponse>
  checkAccount(phone: string, signal?: AbortSignal): Promise<CheckAccountResponse>
  sendMessage(request: SendMessageRequest, signal?: AbortSignal): Promise<SendMessageResponse>
  /** Resolves with `null` when the queue stays empty for `receiveTimeoutSec` seconds. */
  receiveNotification(receiveTimeoutSec: number, signal?: AbortSignal): Promise<Notification | null>
  deleteNotification(receiptId: number, signal?: AbortSignal): Promise<DeleteNotificationResponse>
}

interface RequestOptions {
  httpMethod?: 'GET' | 'POST' | 'DELETE'
  pathSuffix?: string
  query?: Record<string, string>
  body?: unknown
  signal?: AbortSignal | undefined
  timeoutMs?: number
}

/** Default host for an instance: GREEN-API routes instances by the first four digits of `idInstance`. */
export function deriveApiUrl(idInstance: string): string {
  const prefix = idInstance.slice(0, 4)
  return prefix.length === 4 ? `https://${prefix}.api.green-api.com` : 'https://api.green-api.com'
}

function linkSignals(timeoutMs: number, external?: AbortSignal) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort(new GreenApiError('timeout', 'Сервер GREEN-API не ответил вовремя'))
  }, timeoutMs)
  const onExternalAbort = () => controller.abort(external?.reason)

  if (external?.aborted) onExternalAbort()
  else external?.addEventListener('abort', onExternalAbort, { once: true })

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function describeErrorBody(body: unknown): string {
  if (typeof body === 'string') return body
  if (typeof body === 'object' && body !== null) {
    const { message, reason } = body as { message?: unknown; reason?: unknown }
    if (typeof message === 'string') return message
    if (typeof reason === 'string') return reason
  }
  return ''
}

export function createGreenApiClient(
  credentials: Credentials,
  fetchImpl: typeof fetch = (...args) => fetch(...args),
): GreenApiClient {
  const baseUrl = credentials.apiUrl.replace(/\/+$/, '')
  const instancePath = `waInstance${encodeURIComponent(credentials.idInstance)}`
  const token = encodeURIComponent(credentials.apiTokenInstance)

  async function request<T>(method: string, options: RequestOptions = {}): Promise<T> {
    const { httpMethod = 'GET', pathSuffix = '', query, body, signal } = options
    const url = new URL(`${baseUrl}/${instancePath}/${method}/${token}${pathSuffix}`)
    for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value)

    const linked = linkSignals(options.timeoutMs ?? DEFAULT_TIMEOUT_MS, signal)
    try {
      const init: RequestInit = { method: httpMethod, signal: linked.signal }
      if (body !== undefined) {
        init.headers = { 'Content-Type': 'application/json' }
        init.body = JSON.stringify(body)
      }

      let response: Response
      try {
        response = await fetchImpl(url, init)
      } catch (error) {
        if (linked.signal.aborted) throw linked.signal.reason
        throw new GreenApiError('network', 'Нет соединения с GREEN-API. Проверьте сеть и API URL', {
          cause: error,
        })
      }

      const payload = await readBody(response)
      if (!response.ok) throw errorFromResponse(response.status, describeErrorBody(payload))
      return payload as T
    } finally {
      linked.dispose()
    }
  }

  return {
    getStateInstance: (signal) => request<StateInstanceResponse>('getStateInstance', { signal }),

    async checkAccount(phone, signal) {
      const response = await request<CheckAccountResponse & { reason?: string }>('checkAccount', {
        httpMethod: 'POST',
        body: { phoneNumber: Number(phone) },
        signal,
      })
      if (typeof response?.exist !== 'boolean') {
        throw new GreenApiError(
          'http',
          response?.reason ?? 'Не удалось проверить номер. Убедитесь, что инстанс авторизован',
        )
      }
      return response
    },

    sendMessage: (payload, signal) =>
      request<SendMessageResponse>('sendMessage', { httpMethod: 'POST', body: payload, signal }),

    receiveNotification: (receiveTimeoutSec, signal) =>
      request<Notification | null>('receiveNotification', {
        query: { receiveTimeout: String(receiveTimeoutSec) },
        timeoutMs: receiveTimeoutSec * 1000 + LONG_POLL_GRACE_MS,
        signal,
      }),

    deleteNotification: (receiptId, signal) =>
      request<DeleteNotificationResponse>('deleteNotification', {
        httpMethod: 'DELETE',
        pathSuffix: `/${receiptId}`,
        signal,
      }),
  }
}
