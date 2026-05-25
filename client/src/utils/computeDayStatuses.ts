import { MEAL_TAG } from '../types'
import type { Meal } from '../types'

export type DayStatus = 'clean' | 'indulgent' | 'overlimit' | 'empty' | 'future'

export interface DayInfo {
  status: DayStatus
  isToday: boolean
}

/**
 * Computes the status for each day in a given month.
 * Returns a map of day number → DayInfo.
 * Accounts for monthly indulgent limit to determine over-limit days.
 */
export function computeDayStatuses(
  meals: Meal[],
  month: number, // 0-indexed
  year: number,
  monthlyGoal: number | null
): Map<number, DayInfo> {
  const today = new Date()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // Filter meals to this month
  const thisMonthMeals = meals.filter((m) => {
    const d = new Date(m.occurredAt)
    return d.getFullYear() === year && d.getMonth() === month
  })

  // Build set of indulgent days that exceed the monthly goal
  const redDaySet = buildRedDaySet(thisMonthMeals, monthlyGoal)

  const result = new Map<number, DayInfo>()

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day)
    const isFuture = date > today
    const isToday = date.toDateString() === today.toDateString()

    let status: DayStatus
    if (isFuture) {
      status = 'future'
    } else {
      status = getPastDayStatus(date, thisMonthMeals, redDaySet)
    }

    result.set(day, { status, isToday })
  }

  return result
}

/**
 * Returns the set of date strings (indulgent days) that exceed the monthly goal.
 */
function buildRedDaySet(meals: Meal[], monthlyGoal: number | null): Set<string> {
  if (monthlyGoal == null) return new Set()

  const indulgentDays = Array.from(
    new Set(
      meals
        .filter((m) => m.tag === MEAL_TAG.INDULGENT)
        .map((m) => new Date(m.occurredAt).toDateString())
    )
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime())

  return new Set(indulgentDays.slice(monthlyGoal))
}

/**
 * Returns the status for a past day based on its meals.
 */
function getPastDayStatus(
  date: Date,
  meals: Meal[],
  redDaySet: Set<string>
): Exclude<DayStatus, 'future'> {
  const key = date.toDateString()
  const dayMeals = meals.filter((m) => new Date(m.occurredAt).toDateString() === key)

  if (!dayMeals.length) return 'empty'
  const hasIndulgent = dayMeals.some((m) => m.tag === MEAL_TAG.INDULGENT)
  if (!hasIndulgent) return 'clean'
  if (redDaySet.has(key)) return 'overlimit'
  return 'indulgent'
}
