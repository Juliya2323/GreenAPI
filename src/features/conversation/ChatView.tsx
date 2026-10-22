import { useCallback } from 'react'
import { Avatar } from '../../components/Avatar'
import { ArrowLeftIcon } from '../../components/icons'
import { getChatTitle } from '../../domain/chat'
import { formatPhone } from '../../domain/phone'
import type { Message } from '../../domain/types'
import { useChatActions, useChatState } from '../../store/chatContext'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import styles from './ChatView.module.css'

const NO_MESSAGES: readonly Message[] = []

interface ChatViewProps {
  chatId: string
}

export function ChatView({ chatId }: ChatViewProps) {
  const { chats, messages } = useChatState()
  const { sendMessage, retryMessage, selectChat } = useChatActions()
  const chat = chats[chatId]

  const handleSend = useCallback((text: string) => sendMessage(chatId, text), [chatId, sendMessage])
  const handleRetry = useCallback(
    (messageId: string) => retryMessage(chatId, messageId),
    [chatId, retryMessage],
  )

  if (!chat) return null

  const title = getChatTitle(chat)
  const subtitle = chat.phone && chat.name ? formatPhone(chat.phone) : 'MAX'

  return (
    <section className={styles.view} aria-label={`Чат: ${title}`}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.back}
          onClick={() => selectChat(null)}
          aria-label="Назад к списку чатов"
        >
          <ArrowLeftIcon />
        </button>
        <Avatar title={title} seed={chat.id} size={40} />
        <div className={styles.heading}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>{subtitle}</p>
        </div>
      </header>

      <MessageList messages={messages[chatId] ?? NO_MESSAGES} onRetry={handleRetry} />
      <Composer onSend={handleSend} />
    </section>
  )
}
