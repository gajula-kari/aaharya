import { formatTimeDisplay, formatDateLabel, formatLocalDate } from './date'

describe('formatTimeDisplay', () => {
  it('formats 14:30 as 2:30 PM', () => {
    const result = formatTimeDisplay('14:30')
    expect(result).toMatch(/2:30/)
  })

  it('formats 09:05 without padding in display', () => {
    const result = formatTimeDisplay('09:05')
    expect(result).toMatch(/9:05/)
  })
})

describe('formatDateLabel', () => {
  it('returns date string without time when includeTime is false', () => {
    const d = new Date(2024, 0, 15) // Jan 15, 2024
    const result = formatDateLabel(d, false)
    expect(result).toMatch(/January/)
    expect(result).toMatch(/15/)
    expect(result).not.toMatch(/·/)
  })

  it('returns date string with time when includeTime is true', () => {
    const d = new Date(2024, 0, 15, 14, 30)
    const result = formatDateLabel(d, true)
    expect(result).toMatch(/January/)
    expect(result).toMatch(/·/)
    expect(result).toMatch(/2:30/)
  })
})

describe('formatLocalDate', () => {
  it('formats a date as YYYY-MM-DD', () => {
    const d = new Date(2024, 0, 5) // Jan 5, 2024
    expect(formatLocalDate(d)).toBe('2024-01-05')
  })

  it('zero-pads month and day', () => {
    const d = new Date(2024, 8, 3) // Sep 3, 2024
    expect(formatLocalDate(d)).toBe('2024-09-03')
  })
})
