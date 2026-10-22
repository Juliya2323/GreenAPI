import { formatPhone, isValidPhone, normalizePhone } from './phone'

describe('normalizePhone', () => {
  it.each([
    ['+7 (999) 123-45-67', '79991234567'],
    ['8 999 123 45 67', '79991234567'],
    ['+375 29 123-45-67', '375291234567'],
    ['  79991234567 ', '79991234567'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected)
  })
})

describe('isValidPhone', () => {
  it.each(['79991234567', '375291234567'])('accepts %s', (phone) => {
    expect(isValidPhone(phone)).toBe(true)
  })

  it.each(['', '7999123456', '799912345678', '380501234567', '3752912345'])(
    'rejects %s',
    (phone) => {
      expect(isValidPhone(phone)).toBe(false)
    },
  )
})

describe('formatPhone', () => {
  it('formats Russian numbers', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
  })

  it('formats Belarusian numbers', () => {
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67')
  })

  it('falls back to a plus-prefixed string for unknown formats', () => {
    expect(formatPhone('12345')).toBe('+12345')
  })
})
