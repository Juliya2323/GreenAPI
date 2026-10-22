import { getAvatarGradient, getInitials } from '../domain/chat'
import styles from './Avatar.module.css'

interface AvatarProps {
  title: string
  seed: string
  size?: number
}

export function Avatar({ title, seed, size = 48 }: AvatarProps) {
  return (
    <span
      className={styles.avatar}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        backgroundImage: getAvatarGradient(seed),
      }}
      aria-hidden="true"
    >
      {getInitials(title)}
    </span>
  )
}
