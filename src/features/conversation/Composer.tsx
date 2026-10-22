import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendIcon } from '../../components/icons'
import { MAX_MESSAGE_LENGTH } from '../../domain/types'
import styles from './Composer.module.css'

const COUNTER_THRESHOLD = MAX_MESSAGE_LENGTH - 500

function fitHeight(textarea: HTMLTextAreaElement) {
  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

interface ComposerProps {
  onSend: (text: string) => void
}

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const canSend = text.trim() !== ''

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  function submit() {
    if (!canSend) return
    onSend(text)
    setText('')
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.focus()
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form className={styles.composer} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <textarea
          ref={textareaRef}
          className={styles.textarea}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            fitHeight(event.target)
          }}
          onKeyDown={handleKeyDown}
          placeholder="Сообщение"
          aria-label="Текст сообщения"
          maxLength={MAX_MESSAGE_LENGTH}
          rows={1}
        />
        {text.length > COUNTER_THRESHOLD && (
          <span className={styles.counter} aria-live="polite">
            {text.length}/{MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <button
        type="submit"
        className={styles.send}
        disabled={!canSend}
        aria-label="Отправить"
        title="Отправить (Enter)"
      >
        <SendIcon />
      </button>
    </form>
  )
}
