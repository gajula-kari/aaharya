import { describe, it, expect } from 'vitest'
import { generateHeadline } from './shareHeadline'

describe('generateHeadline', () => {
  describe('no goal set (monthlyGoal === null)', () => {
    it('returns "a mindful month" with singular "day"', () => {
      const result = generateHeadline(1, null)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('1 indulgent day logged.')
    })

    it('returns "a mindful month" with plural "days"', () => {
      const result = generateHeadline(5, null)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('5 indulgent days logged.')
    })

    it('returns "a mindful month" with zero days', () => {
      const result = generateHeadline(0, null)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('0 indulgent days logged.')
    })
  })

  describe('clean month (indulgentDays === 0, monthlyGoal set)', () => {
    it('returns "a clean month"', () => {
      const result = generateHeadline(0, 5)
      expect(result.headline).toBe('a clean month.')
      expect(result.subtext).toBe('not a single indulgent day.')
    })

    it('works with goal=1', () => {
      const result = generateHeadline(0, 1)
      expect(result.headline).toBe('a clean month.')
      expect(result.subtext).toBe('not a single indulgent day.')
    })

    it('works with goal=10', () => {
      const result = generateHeadline(0, 10)
      expect(result.headline).toBe('a clean month.')
      expect(result.subtext).toBe('not a single indulgent day.')
    })
  })

  describe('well within limit (indulgentDays ≤ goal × 0.5)', () => {
    it('returns "a mindful month" with singular "time"', () => {
      const result = generateHeadline(1, 5)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('indulged 1 time. gave myself 5.')
    })

    it('returns "a mindful month" with plural "times"', () => {
      const result = generateHeadline(2, 5)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('indulged 2 times. gave myself 5.')
    })

    it('handles boundary: exactly 50% of goal', () => {
      // goal=10, indulgentDays=5 (exactly 50%)
      const result = generateHeadline(5, 10)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('indulged 5 times. gave myself 10.')
    })

    it('handles small goal: goal=3, indulgentDays=1', () => {
      const result = generateHeadline(1, 3)
      expect(result.headline).toBe('a mindful month.')
      expect(result.subtext).toBe('indulged 1 time. gave myself 3.')
    })
  })

  describe('within limit (indulgentDays ≤ goal)', () => {
    it('returns "stayed within my limit" with singular "day"', () => {
      const result = generateHeadline(6, 10)
      expect(result.headline).toBe('stayed within my limit.')
      expect(result.subtext).toBe('6 of 10 indulgent days used.')
    })

    it('returns "stayed within my limit" with plural "days"', () => {
      const result = generateHeadline(5, 7)
      expect(result.headline).toBe('stayed within my limit.')
      expect(result.subtext).toBe('5 of 7 indulgent days used.')
    })

    it('handles exactly at limit', () => {
      const result = generateHeadline(7, 7)
      expect(result.headline).toBe('stayed within my limit.')
      expect(result.subtext).toBe('7 of 7 indulgent days used.')
    })

    it('handles goal=1', () => {
      const result = generateHeadline(1, 1)
      expect(result.headline).toBe('stayed within my limit.')
      expect(result.subtext).toBe('1 of 1 indulgent day used.')
    })
  })

  describe('over by exactly one (indulgentDays === goal + 1)', () => {
    it('returns "almost stayed within it"', () => {
      const result = generateHeadline(8, 7)
      expect(result.headline).toBe('almost stayed within it.')
      expect(result.subtext).toBe('went over by one. being honest about it.')
    })

    it('handles goal=1, indulgentDays=2', () => {
      const result = generateHeadline(2, 1)
      expect(result.headline).toBe('almost stayed within it.')
      expect(result.subtext).toBe('went over by one. being honest about it.')
    })

    it('handles goal=10, indulgentDays=11', () => {
      const result = generateHeadline(11, 10)
      expect(result.headline).toBe('almost stayed within it.')
      expect(result.subtext).toBe('went over by one. being honest about it.')
    })
  })

  describe('over by more than one (indulgentDays > goal + 1)', () => {
    it('returns "an indulgent month"', () => {
      const result = generateHeadline(9, 7)
      expect(result.headline).toBe('an indulgent month.')
      expect(result.subtext).toBe('being honest about it. next month starts fresh.')
    })

    it('handles goal=1, indulgentDays=5', () => {
      const result = generateHeadline(5, 1)
      expect(result.headline).toBe('an indulgent month.')
      expect(result.subtext).toBe('being honest about it. next month starts fresh.')
    })

    it('handles goal=10, indulgentDays=15', () => {
      const result = generateHeadline(15, 10)
      expect(result.headline).toBe('an indulgent month.')
      expect(result.subtext).toBe('being honest about it. next month starts fresh.')
    })

    it('handles goal=5, indulgentDays=20', () => {
      const result = generateHeadline(20, 5)
      expect(result.headline).toBe('an indulgent month.')
      expect(result.subtext).toBe('being honest about it. next month starts fresh.')
    })
  })

  describe('edge cases and boundary conditions', () => {
    it('handles goal=0 as over-limit', () => {
      // goal=0, indulgentDays=1 → over by 1, so "almost"
      const result = generateHeadline(1, 0)
      expect(result.headline).toBe('almost stayed within it.')
    })

    it('handles goal=0 with multiple indulgent days', () => {
      // goal=0, indulgentDays=3 → over by 2+, so "an indulgent month"
      const result = generateHeadline(3, 0)
      expect(result.headline).toBe('an indulgent month.')
    })

    it('handles very large numbers', () => {
      const result = generateHeadline(100, 50)
      expect(result.headline).toBe('an indulgent month.')
      expect(result.subtext).toBe('being honest about it. next month starts fresh.')
    })
  })
})
