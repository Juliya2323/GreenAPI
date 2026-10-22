/**
 * GREEN-API for MAX accepts phone numbers of Russia (`7`, 11 digits) and Belarus (`375`, 12 digits) only.
 */
const RU_PATTERN = /^7\d{10}$/
const BY_PATTERN = /^375\d{9}$/

export function normalizePhone(input: string): string {
  const digits = input.replace(/\D/g, '')
  if (digits.length === 11 && digits.startsWith('8')) {
    return `7${digits.slice(1)}`
  }
  return digits
}

export function isValidPhone(phone: string): boolean {
  return RU_PATTERN.test(phone) || BY_PATTERN.test(phone)
}

export function formatPhone(phone: string): string {
  if (RU_PATTERN.test(phone)) {
    return `+7 ${phone.slice(1, 4)} ${phone.slice(4, 7)}-${phone.slice(7, 9)}-${phone.slice(9)}`
  }
  if (BY_PATTERN.test(phone)) {
    return `+375 ${phone.slice(3, 5)} ${phone.slice(5, 8)}-${phone.slice(8, 10)}-${phone.slice(10)}`
  }
  return phone ? `+${phone}` : ''
}
