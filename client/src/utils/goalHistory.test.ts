import { getGoalForMonth } from './goalHistory'
import type { GoalHistoryEntry } from '../types'

describe('getGoalForMonth', () => {
  it('returns null when goalHistory is empty', () => {
    expect(getGoalForMonth([], 2026, 4)).toBeNull()
  })

  it('returns the goal when an exact entry exists for the target month', () => {
    const history: GoalHistoryEntry[] = [{ goal: 7, month: '2026-05' }]
    // month=4 → 0-indexed May
    expect(getGoalForMonth(history, 2026, 4)).toBe(7)
  })

  it('returns the most recent goal before the target month when no exact entry', () => {
    const history: GoalHistoryEntry[] = [
      { goal: 5, month: '2026-01' },
      { goal: 8, month: '2026-03' },
    ]
    // target: April 2026 (month=3) — no April entry, so March's 8 applies
    expect(getGoalForMonth(history, 2026, 3)).toBe(8)
  })

  it('returns null when all entries are after the target month', () => {
    const history: GoalHistoryEntry[] = [{ goal: 7, month: '2026-06' }]
    // target: May 2026 (month=4) — only June entry exists
    expect(getGoalForMonth(history, 2026, 4)).toBeNull()
  })

  it('handles multiple goal changes and returns the one closest to the target', () => {
    const history: GoalHistoryEntry[] = [
      { goal: 4, month: '2025-11' },
      { goal: 6, month: '2026-01' },
      { goal: 10, month: '2026-04' },
    ]
    // target: March 2026 (month=2) → Jan goal of 6 applies
    expect(getGoalForMonth(history, 2026, 2)).toBe(6)
    // target: June 2026 (month=5) → April goal of 10 applies
    expect(getGoalForMonth(history, 2026, 5)).toBe(10)
    // target: October 2025 (month=9) → no earlier entry
    expect(getGoalForMonth(history, 2025, 9)).toBeNull()
  })

  it('handles out-of-order history entries (sorts them internally)', () => {
    const history: GoalHistoryEntry[] = [
      { goal: 10, month: '2026-04' },
      { goal: 6, month: '2026-01' },
      { goal: 4, month: '2025-11' },
    ]
    // same as above but history is unsorted
    expect(getGoalForMonth(history, 2026, 2)).toBe(6)
  })

  it('handles December correctly (month=11)', () => {
    const history: GoalHistoryEntry[] = [
      { goal: 5, month: '2026-12' },
      { goal: 3, month: '2026-06' },
    ]
    expect(getGoalForMonth(history, 2026, 11)).toBe(5)
  })

  it('handles January correctly (month=0)', () => {
    const history: GoalHistoryEntry[] = [{ goal: 7, month: '2026-01' }]
    expect(getGoalForMonth(history, 2026, 0)).toBe(7)
  })

  it('returns exact match when target month equals an entry month exactly', () => {
    const history: GoalHistoryEntry[] = [
      { goal: 3, month: '2026-02' },
      { goal: 9, month: '2026-05' },
    ]
    expect(getGoalForMonth(history, 2026, 4)).toBe(9)
  })
})
