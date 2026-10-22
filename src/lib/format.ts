const LOCALE = 'ru-RU'

const timeFormatter = new Intl.DateTimeFormat(LOCALE, { hour: '2-digit', minute: '2-digit' })
const shortDateFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})
const dayFormatter = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' })
const dayWithYearFormatter = new Intl.DateTimeFormat(LOCALE, {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DAY_MS = 24 * 60 * 60 * 1000

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

export function isSameDay(a: number, b: number): boolean {
  return startOfDay(a) === startOfDay(b)
}

export function formatTime(timestamp: number): string {
  return timeFormatter.format(timestamp)
}

/** Chat list style: time for today, date otherwise. */
export function formatListDate(timestamp: number, now = Date.now()): string {
  return isSameDay(timestamp, now) ? formatTime(timestamp) : shortDateFormatter.format(timestamp)
}

export function formatDayLabel(timestamp: number, now = Date.now()): string {
  const diffDays = Math.round((startOfDay(now) - startOfDay(timestamp)) / DAY_MS)
  if (diffDays === 0) return 'Сегодня'
  if (diffDays === 1) return 'Вчера'
  const sameYear = new Date(timestamp).getFullYear() === new Date(now).getFullYear()
  return (sameYear ? dayFormatter : dayWithYearFormatter).format(timestamp)
}
