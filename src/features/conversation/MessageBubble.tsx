import { memo } from 'react'
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '../../components/icons'
import type { Message, MessageStatus } from '../../domain/types'
import { formatTime } from '../../lib/format'
import styles from './MessageBubble.module.css'

const STATUS_LABELS: Record<MessageStatus, string> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не отправлено',
}

function StatusIcon({ status }: { status: MessageStatus }) {
  switch (status) {
    case 'pending':
      return <ClockIcon />
    case 'sent':
      return <CheckIcon />
    case 'delivered':
    case 'read':
      return <DoubleCheckIcon />
    case 'failed':
      return <AlertIcon />
  }
}

interface MessageBubbleProps {
  message: Message
  onRetry: (messageId: string) => void
}

export const MessageBubble = memo(function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const { direction, status } = message

  return (
    <div className={styles.row} data-direction={direction}>
      <div className={styles.bubble} data-status={status}>
        <p className={styles.text}>{message.text}</p>
        <span className={styles.meta}>
          <time dateTime={new Date(message.timestamp).toISOString()}>
            {formatTime(message.timestamp)}
          </time>
          {direction === 'outgoing' && status && (
            <span className={styles.status} data-status={status} title={STATUS_LABELS[status]}>
              <StatusIcon status={status} />
              <span className="visually-hidden">{STATUS_LABELS[status]}</span>
            </span>
          )}
        </span>
      </div>
      {status === 'failed' && (
        <button type="button" className={styles.retry} onClick={() => onRetry(message.id)}>
          Не отправлено. Повторить
        </button>
      )}
    </div>
  )
})
