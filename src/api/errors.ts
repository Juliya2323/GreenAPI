export type GreenApiErrorKind = 'network' | 'timeout' | 'unauthorized' | 'rateLimit' | 'http'

export class GreenApiError extends Error {
  override readonly name = 'GreenApiError'
  readonly kind: GreenApiErrorKind
  readonly status: number | undefined

  constructor(
    kind: GreenApiErrorKind,
    message: string,
    options: { status?: number; cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause })
    this.kind = kind
    this.status = options.status
  }
}

const STATUS_MESSAGES: Record<number, string> = {
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Доступ запрещён. Проверьте apiTokenInstance и статус инстанса',
  404: 'Метод или инстанс не найден. Проверьте idInstance и API URL',
  429: 'Слишком много запросов. Повторите попытку позже',
  466: 'Превышены ограничения тарифа GREEN-API',
}

export function errorFromResponse(status: number, details: string): GreenApiError {
  const kind: GreenApiErrorKind =
    status === 401 || status === 403 ? 'unauthorized' : status === 429 ? 'rateLimit' : 'http'
  const base = STATUS_MESSAGES[status] ?? `Ошибка GREEN-API (HTTP ${status})`
  const message = details && !STATUS_MESSAGES[status] ? `${base}: ${details}` : base
  return new GreenApiError(kind, message, { status })
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  return 'Неизвестная ошибка'
}
