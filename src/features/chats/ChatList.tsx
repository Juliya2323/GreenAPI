import { memo, useMemo } from 'react'
import { Avatar } from '../../components/Avatar'
import { getChatTitle } from '../../domain/chat'
import type { Chat, Message } from '../../domain/types'
import { formatListDate } from '../../lib/format'
import { useChatActions, useChatState } from '../../store/chatContext'
import styles from './ChatList.module.css'

export function ChatList() {
  const { chats, messages, activeChatId } = useChatState()
  const { selectChat } = useChatActions()

  const sortedChats = useMemo(
    () => Object.values(chats).sort((a, b) => b.updatedAt - a.updatedAt),
    [chats],
  )

  if (sortedChats.length === 0) {
    return (
      <p className={styles.empty}>
        Чатов пока нет. Введите номер телефона получателя, чтобы начать переписку.
      </p>
    )
  }

  return (
    <ul className={styles.list} aria-label="Чаты">
      {sortedChats.map((chat) => (
        <li key={chat.id}>
          <ChatListItem
            chat={chat}
            lastMessage={messages[chat.id]?.at(-1)}
            isActive={chat.id === activeChatId}
            onSelect={selectChat}
          />
        </li>
      ))}
    </ul>
  )
}

interface ChatListItemProps {
  chat: Chat
  lastMessage: Message | undefined
  isActive: boolean
  onSelect: (chatId: string) => void
}

const ChatListItem = memo(function ChatListItem({
  chat,
  lastMessage,
  isActive,
  onSelect,
}: ChatListItemProps) {
  const title = getChatTitle(chat)
  const preview = lastMessage
    ? `${lastMessage.direction === 'outgoing' ? 'Вы: ' : ''}${lastMessage.text}`
    : 'Нет сообщений'

  return (
    <button
      type="button"
      className={styles.item}
      onClick={() => onSelect(chat.id)}
      aria-current={isActive ? 'true' : undefined}
    >
      <Avatar title={title} seed={chat.id} />
      <span className={styles.body}>
        <span className={styles.row}>
          <span className={styles.title}>{title}</span>
          {lastMessage && (
            <time className={styles.time} dateTime={new Date(lastMessage.timestamp).toISOString()}>
              {formatListDate(lastMessage.timestamp)}
            </time>
          )}
        </span>
        <span className={styles.row}>
          <span className={styles.preview}>{preview}</span>
          {chat.unreadCount > 0 && (
            <span className={styles.badge} aria-label={`Непрочитанных: ${chat.unreadCount}`}>
              {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
            </span>
          )}
        </span>
      </span>
    </button>
  )
})
