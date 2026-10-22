import { MaxLogo } from '../components/MaxLogo'
import { Sidebar } from '../features/chats/Sidebar'
import { ChatView } from '../features/conversation/ChatView'
import { useChatState } from '../store/chatContext'
import styles from './ChatLayout.module.css'

interface ChatLayoutProps {
  idInstance: string
  onLogout: () => void
}

export function ChatLayout({ idInstance, onLogout }: ChatLayoutProps) {
  const { activeChatId } = useChatState()

  return (
    <div className={styles.layout} data-chat-open={activeChatId !== null}>
      <Sidebar idInstance={idInstance} onLogout={onLogout} />
      <main className={styles.main}>
        {activeChatId ? (
          <ChatView key={activeChatId} chatId={activeChatId} />
        ) : (
          <div className={styles.placeholder}>
            <MaxLogo size={72} />
            <h2>Выберите чат</h2>
            <p>или создайте новый, указав номер телефона получателя</p>
          </div>
        )}
      </main>
    </div>
  )
}
