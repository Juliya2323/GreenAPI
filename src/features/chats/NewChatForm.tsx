import { useId, useState, type FormEvent } from 'react'
import { getErrorMessage } from '../../api/errors'
import { PlusIcon } from '../../components/icons'
import { useChatActions } from '../../store/chatContext'
import styles from './NewChatForm.module.css'

export function NewChatForm() {
  const { openChatByPhone } = useChatActions()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setSubmitting] = useState(false)
  const errorId = useId()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!phone.trim() || isSubmitting) return

    setSubmitting(true)
    setError(null)
    try {
      await openChatByPhone(phone)
      setPhone('')
    } catch (caught) {
      setError(getErrorMessage(caught))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Новый чат">
      <div className={styles.row}>
        <input
          className={styles.input}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value)
            setError(null)
          }}
          placeholder="+7 999 123-45-67"
          aria-label="Номер телефона получателя"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          disabled={isSubmitting}
        />
        <button
          type="submit"
          className={styles.button}
          disabled={!phone.trim() || isSubmitting}
          aria-label="Создать чат"
          title="Создать чат"
        >
          {isSubmitting ? <span className={styles.spinner} aria-hidden="true" /> : <PlusIcon />}
        </button>
      </div>
      {error && (
        <p id={errorId} className={styles.error} role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
