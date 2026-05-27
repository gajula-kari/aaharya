import type { GoalHistoryEntry } from '../types'

/**
 * Returns the goal that was active for a given month.
 *
 * @param goalHistory - array of { goal, month } entries (month is "YYYY-MM", 1-indexed)
 * @param year        - full year (e.g. 2026)
 * @param month       - 0-indexed month (JS Date convention: 0=Jan, 11=Dec)
 * @returns the most recent goal whose month ≤ targetMonth, or null if none
 */
export function getGoalForMonth(
  goalHistory: GoalHistoryEntry[],
  year: number,
  month: number
): number | null {
  const targetMonth = `${year}-${String(month + 1).padStart(2, '0')}`

  const applicable = [...goalHistory]
    .sort((a, b) => a.month.localeCompare(b.month))
    .filter((e) => e.month <= targetMonth)

  if (applicable.length === 0) return null

  return applicable[applicable.length - 1].goal
}
