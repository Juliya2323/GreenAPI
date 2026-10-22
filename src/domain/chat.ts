import { formatPhone } from './phone'
import type { Chat } from './types'

export function getChatTitle(chat: Chat): string {
  return chat.name || (chat.phone ? formatPhone(chat.phone) : `Чат ${chat.id}`)
}

export function getInitials(title: string): string {
  const words = title
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return '?'
  if (/^\d/.test(words[0] ?? '')) return '#'
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('')
}

const AVATAR_PALETTE = [
  ['#ff8a65', '#ff5e62'],
  ['#ffb347', '#ff8c37'],
  ['#4facfe', '#2d7bff'],
  ['#43e97b', '#1fb98b'],
  ['#a18cd1', '#7f5cff'],
  ['#f093fb', '#d84bc8'],
  ['#5ee7df', '#2fb0c6'],
] as const

export function getAvatarGradient(seed: string): string {
  let hash = 0
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const [from, to] = AVATAR_PALETTE[hash % AVATAR_PALETTE.length] ?? AVATAR_PALETTE[0]
  return `linear-gradient(135deg, ${from}, ${to})`
}
