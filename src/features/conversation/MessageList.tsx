import { Fragment, useLayoutEffect, useRef } from 'react'
import type { Message } from '../../domain/types'
import { formatDayLabel, isSameDay } from '../../lib/format'
import { MessageBubble } from './MessageBubble'
import styles from './MessageList.module.css'

const STICK_TO_BOTTOM_THRESHOLD_PX = 120

interface MessageListProps {
  messages: readonly Message[]
  onRetry: (messageId: string) => void
}

export function MessageList({ messages, onRetry }: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const lastMessage = messages.at(-1)
  const lastMessageId = lastMessage?.id
  const isLastOutgoing = lastMessage?.direction === 'outgoing'

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container || lastMessageId === undefined) return
    // Keep the position if the user scrolled up to read history, unless they just sent a message.
    if (isNearBottomRef.current || isLastOutgoing) {
      container.scrollTop = container.scrollHeight
    }
  }, [lastMessageId, isLastOutgoing])

  function handleScroll() {
    const container = containerRef.current
    if (!container) return
    const distance = container.scrollHeight - container.scrollTop - container.clientHeight
    isNearBottomRef.current = distance < STICK_TO_BOTTOM_THRESHOLD_PX
  }

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Сообщения"
    >
      {messages.length === 0 ? (
        <p className={styles.placeholder}>Сообщений пока нет. Напишите первым!</p>
      ) : (
        <div className={styles.list}>
          {messages.map((message, index) => {
            const previous = messages[index - 1]
            const showDay = !previous || !isSameDay(previous.timestamp, message.timestamp)
            return (
              <Fragment key={message.id}>
                {showDay && (
                  <div className={styles.day}>
                    <span>{formatDayLabel(message.timestamp)}</span>
                  </div>
                )}
                <MessageBubble message={message} onRetry={onRetry} />
              </Fragment>
            )
          })}
        </div>
      )}
    </div>
  )
}
