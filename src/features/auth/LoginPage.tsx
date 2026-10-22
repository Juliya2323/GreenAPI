import { useId, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/errors'
import { createGreenApiClient, deriveApiUrl, type GreenApiClient } from '../../api/greenApiClient'
import type { InstanceState } from '../../api/types'
import { EyeIcon, EyeOffIcon } from '../../components/icons'
import { MaxLogo } from '../../components/MaxLogo'
import type { Credentials } from '../../domain/types'
import styles from './LoginPage.module.css'

interface LoginPageProps {
  onLogin: (credentials: Credentials) => void
  clientFactory?: (credentials: Credentials) => GreenApiClient
}

const STATE_ERRORS: Partial<Record<InstanceState, string>> = {
  notAuthorized: 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API',
  blocked: 'Инстанс заблокирован',
  starting: 'Инстанс запускается. Повторите попытку через минуту',
  sleepMode: 'Инстанс в спящем режиме. Повторите попытку через минуту',
}

export function LoginPage({ onLogin, clientFactory = createGreenApiClient }: LoginPageProps) {
  const [idInstance, setIdInstance] = useState('')
  const [apiTokenInstance, setApiTokenInstance] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [isTokenVisible, setTokenVisible] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const errorId = useId()

  const trimmedId = idInstance.trim()
  const trimmedToken = apiTokenInstance.trim()
  const canSubmit = trimmedId !== '' && trimmedToken !== '' && !isSubmitting

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSubmit) return

    if (!/^\d+$/.test(trimmedId)) {
      setError('idInstance должен состоять только из цифр')
      return
    }

    const credentials: Credentials = {
      idInstance: trimmedId,
      apiTokenInstance: trimmedToken,
      apiUrl: apiUrl.trim() || deriveApiUrl(trimmedId),
    }

    setSubmitting(true)
    setError(null)
    try {
      const { stateInstance } = await clientFactory(credentials).getStateInstance()
      const stateError = STATE_ERRORS[stateInstance]
      if (stateError) {
        setError(stateError)
        return
      }
      onLogin(credentials)
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  const errorProps = error ? { 'aria-describedby': errorId, 'aria-invalid': true } : {}

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit} noValidate>
        <div className={styles.header}>
          <MaxLogo size={56} />
          <h1 className={styles.title}>Вход в MAX</h1>
          <p className={styles.subtitle}>Укажите данные инстанса из личного кабинета GREEN-API</p>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>idInstance</span>
          <input
            className={styles.input}
            name="idInstance"
            value={idInstance}
            onChange={(event) => setIdInstance(event.target.value)}
            inputMode="numeric"
            autoComplete="username"
            placeholder="3100000000"
            required
            {...errorProps}
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>apiTokenInstance</span>
          <span className={styles.inputWrapper}>
            <input
              className={styles.input}
              name="apiTokenInstance"
              type={isTokenVisible ? 'text' : 'password'}
              value={apiTokenInstance}
              onChange={(event) => setApiTokenInstance(event.target.value)}
              autoComplete="current-password"
              spellCheck={false}
              placeholder="Ключ доступа инстанса"
              required
              {...errorProps}
            />
            <button
              type="button"
              className={styles.toggle}
              onClick={() => setTokenVisible((visible) => !visible)}
              aria-label={isTokenVisible ? 'Скрыть токен' : 'Показать токен'}
              aria-pressed={isTokenVisible}
            >
              {isTokenVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </span>
        </label>

        <details className={styles.advanced}>
          <summary>Дополнительно</summary>
          <label className={styles.field}>
            <span className={styles.label}>apiUrl</span>
            <input
              className={styles.input}
              name="apiUrl"
              type="url"
              value={apiUrl}
              onChange={(event) => setApiUrl(event.target.value)}
              placeholder={deriveApiUrl(trimmedId || '3100')}
              spellCheck={false}
            />
            <span className={styles.hint}>
              По умолчанию определяется по idInstance. Укажите, если в личном кабинете другой адрес.
            </span>
          </label>
        </details>

        {error && (
          <p id={errorId} className={styles.error} role="alert">
            {error}
          </p>
        )}

        <button type="submit" className={styles.submit} disabled={!canSubmit}>
          {isSubmitting ? 'Проверяем…' : 'Войти'}
        </button>

        <p className={styles.footer}>
          Данные доступа находятся в{' '}
          <a href="https://console.green-api.com" target="_blank" rel="noreferrer">
            личном кабинете GREEN-API
          </a>
        </p>
      </form>
    </main>
  )
}
