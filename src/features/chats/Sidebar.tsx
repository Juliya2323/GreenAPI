import type { ConnectionStatus } from '../../api/notificationPoller'
import { LogoutIcon } from '../../components/icons'
import { MaxLogo } from '../../components/MaxLogo'
import { useConnection } from '../../store/chatContext'
import { ChatList } from './ChatList'
import { NewChatForm } from './NewChatForm'
import styles from './Sidebar.module.css'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connecting: 'Подключение…',
  online: 'В сети',
  error: 'Нет соединения',
}

interface SidebarProps {
  idInstance: string
  onLogout: () => void
}

export function Sidebar({ idInstance, onLogout }: SidebarProps) {
  const { status, error } = useConnection()

  return (
    <aside className={styles.sidebar} aria-label="Список чатов">
      <header className={styles.header}>
        <MaxLogo size={36} />
        <div className={styles.heading}>
          <h1 className={styles.title}>Чаты</h1>
          <p className={styles.status} data-status={status} aria-live="polite">
            <span className={styles.dot} aria-hidden="true" />
            {STATUS_LABELS[status]} · {idInstance}
          </p>
        </div>
        <button
          type="button"
          className={styles.iconButton}
          onClick={onLogout}
          aria-label="Выйти"
          title="Выйти"
        >
          <LogoutIcon />
        </button>
      </header>

      {status === 'error' && error && (
        <p className={styles.banner} role="alert">
          {error}. Повторяем попытку…
        </p>
      )}

      <NewChatForm />
      <ChatList />
    </aside>
  )
}
