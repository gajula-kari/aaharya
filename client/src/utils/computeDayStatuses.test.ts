import { describe, it, expect, beforeEach } from 'vitest'
import { computeDayStatuses, type DayStatus } from './computeDayStatuses'
import type { Meal } from '../types'

const createMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  userId: 'user-1',
  imageUrl: null,
  tag: 'CLEAN' as const,
  amountSpent: null,
  note: null,
  occurredAt: Date.now(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
})

describe('computeDayStatuses', () => {
  let today: Date
  let year: number
  let month: number

  beforeEach(() => {
    today = new Date()
    year = today.getFullYear()
    month = today.getMonth()
  })

  it('returns empty status for days with no meals', () => {
    const result = computeDayStatuses([], month, year, null)
    expect(result.get(1)?.status).toBe('empty')
  })

  it('marks days with only clean meals as clean', () => {
    const cleanDay = new Date(year, month, 5)
    const meals = [createMeal({ tag: 'CLEAN', occurredAt: cleanDay.getTime() })]
    const result = computeDayStatuses(meals, month, year, null)
    expect(result.get(5)?.status).toBe('clean')
  })

  it('marks days with any indulgent meal as indulgent', () => {
    const indulgentDay = new Date(year, month, 10)
    const meals = [
      createMeal({ tag: 'CLEAN', occurredAt: new Date(year, month, 10).getTime() }),
      createMeal({ tag: 'INDULGENT', occurredAt: indulgentDay.getTime() }),
    ]
    const result = computeDayStatuses(meals, month, year, null)
    expect(result.get(10)?.status).toBe('indulgent')
  })

  it('marks future days as future', () => {
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const futureYear = tomorrow.getFullYear()
    const futureMonth = tomorrow.getMonth()
    const futureDay = tomorrow.getDate()

    const result = computeDayStatuses([], futureMonth, futureYear, null)
    expect(result.get(futureDay)?.status).toBe('future')
  })

  it('marks today with isToday flag', () => {
    const result = computeDayStatuses([], month, year, null)
    const todayInfo = result.get(today.getDate())
    expect(todayInfo?.isToday).toBe(true)
  })

  it('marks non-today days with isToday = false', () => {
    const result = computeDayStatuses([], month, year, null)
    const otherDay = today.getDate() === 1 ? 2 : 1
    expect(result.get(otherDay)?.isToday).toBe(false)
  })

  describe('over-limit logic', () => {
    it('marks indulgent days within goal as indulgent, not overlimit', () => {
      const goal = 2
      // Day 1 and 2 are indulgent (within goal)
      const meals = [
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 1).getTime() }),
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 2).getTime() }),
      ]
      const result = computeDayStatuses(meals, month, year, goal)
      expect(result.get(1)?.status).toBe('indulgent')
      expect(result.get(2)?.status).toBe('indulgent')
    })

    it('marks indulgent days beyond goal as overlimit', () => {
      const goal = 1
      // Day 1 is indulgent (within goal), Day 2 is indulgent (over goal)
      const meals = [
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 1).getTime() }),
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 2).getTime() }),
      ]
      const result = computeDayStatuses(meals, month, year, goal)
      expect(result.get(1)?.status).toBe('indulgent')
      expect(result.get(2)?.status).toBe('overlimit')
    })

    it('respects chronological order for over-limit boundary', () => {
      const goal = 1
      // Day 5 indulgent first, then day 2 indulgent
      // When sorted chronologically, day 2 (first) is within goal, day 5 (second) is over
      const meals = [
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 5).getTime() }),
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 2).getTime() }),
      ]
      const result = computeDayStatuses(meals, month, year, goal)
      expect(result.get(2)?.status).toBe('indulgent')
      expect(result.get(5)?.status).toBe('overlimit')
    })

    it('handles goal = 0 (all indulgent days are over-limit)', () => {
      const goal = 0
      const meals = [
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 1).getTime() }),
      ]
      const result = computeDayStatuses(meals, month, year, goal)
      expect(result.get(1)?.status).toBe('overlimit')
    })

    it('ignores goal when null', () => {
      const meals = [
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 1).getTime() }),
        createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 2).getTime() }),
      ]
      const result = computeDayStatuses(meals, month, year, null)
      expect(result.get(1)?.status).toBe('indulgent')
      expect(result.get(2)?.status).toBe('indulgent')
    })
  })

  it('filters meals by month and year correctly', () => {
    const lastMonth = month === 0 ? 11 : month - 1
    const lastMonthYear = month === 0 ? year - 1 : year

    const meals = [
      // Meal in current month
      createMeal({ tag: 'INDULGENT', occurredAt: new Date(year, month, 5).getTime() }),
      // Meal in different month (should be ignored)
      createMeal({ tag: 'INDULGENT', occurredAt: new Date(lastMonthYear, lastMonth, 5).getTime() }),
    ]

    const result = computeDayStatuses(meals, month, year, 0)

    // Day 5 of current month should be overlimit (because goal=0)
    expect(result.get(5)?.status).toBe('overlimit')

    // In last month, any day should be empty (because we filtered to current month)
    const lastMonthResult = computeDayStatuses(meals, lastMonth, lastMonthYear, 0)
    expect(lastMonthResult.get(5)?.status).toBe('overlimit')
  })

  it('returns a map with all days of the month', () => {
    const result = computeDayStatuses([], month, year, null)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    expect(result.size).toBe(daysInMonth)

    for (let day = 1; day <= daysInMonth; day++) {
      expect(result.has(day)).toBe(true)
    }
  })
})
