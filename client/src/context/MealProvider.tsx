import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { MealContext } from './MealContext'
import * as api from '../services/mealApi'
import { CACHE_KEYS } from '../constants/cacheKeys'
import type { CreateMealPayload, Meal } from '../types'

/** "YYYY-MM" string from a 0-indexed month (JS Date convention). */
function monthKey(year: number, month0: number): string {
  return `${year}-${String(month0 + 1).padStart(2, '0')}`
}

function cacheKey(year: number, month0: number): string {
  return `aaharya_meals_${monthKey(year, month0)}`
}

function readMonthCache(year: number, month0: number): Meal[] | null {
  try {
    const raw = localStorage.getItem(cacheKey(year, month0))
    return raw ? (JSON.parse(raw) as Meal[]) : null
  } catch {
    return null
  }
}

function writeMonthCache(year: number, month0: number, meals: Meal[]): void {
  try {
    // imageUrl excluded — not needed for streak/calendar and keeps the cache small.
    const slim = meals.map(({ imageUrl: _, ...rest }) => rest)
    localStorage.setItem(cacheKey(year, month0), JSON.stringify(slim))
  } catch {
    // localStorage unavailable (private browsing quota) — silently skip
  }
}

export function MealProvider({ children }: { children: ReactNode }) {
  const now = new Date()
  const nowYear = now.getFullYear()
  const nowMonth = now.getMonth() // 0-indexed

  // Last month — handles January correctly (new Date(y, -1, 1) = Dec of prev year)
  const lastDate = new Date(nowYear, nowMonth - 1, 1)
  const lastYear = lastDate.getFullYear()
  const lastMonth = lastDate.getMonth() // 0-indexed

  const [meals, setMeals] = useState<Meal[]>(() => {
    // Seed from current + last month cache for instant display
    const curr = readMonthCache(nowYear, nowMonth) ?? []
    const last = readMonthCache(lastYear, lastMonth) ?? []
    return [...curr, ...last]
  })
  const [loading, setLoading] = useState(() => {
    const curr = readMonthCache(nowYear, nowMonth)
    return !curr || curr.length === 0
  })
  const [error, setError] = useState<string | null>(null)

  // Ref tracks which months are loaded (for guards in async callbacks).
  // State exposes the same info to consumers and triggers re-renders.
  const loadedMonthsRef = useRef<Set<string>>(new Set())
  const [loadedMonths, setLoadedMonths] = useState<Set<string>>(new Set())
  const fetchingMonthsRef = useRef<Set<string>>(new Set())
  const [fetchingMonths, setFetchingMonths] = useState<Set<string>>(new Set())

  const markLoaded = useCallback((year: number, month0: number) => {
    const key = monthKey(year, month0)
    loadedMonthsRef.current.add(key)
    setLoadedMonths(new Set(loadedMonthsRef.current))
  }, [])

  // Replace all meals for a given month in state, keeping other months intact.
  const mergeMonthMeals = useCallback((year: number, month0: number, newMeals: Meal[]) => {
    const start = new Date(year, month0, 1).getTime()
    const end = new Date(year, month0 + 1, 1).getTime() // handles Dec → Jan correctly
    setMeals((prev) => [
      ...prev.filter((m) => m.occurredAt < start || m.occurredAt >= end),
      ...newMeals,
    ])
  }, [])

  // Boot: fetch current + last month in parallel
  useEffect(() => {
    Promise.all([
      api.fetchMealsByMonth(nowYear, nowMonth).then((fetched) => {
        writeMonthCache(nowYear, nowMonth, fetched)
        mergeMonthMeals(nowYear, nowMonth, fetched)
        markLoaded(nowYear, nowMonth)
      }),
      api.fetchMealsByMonth(lastYear, lastMonth).then((fetched) => {
        writeMonthCache(lastYear, lastMonth, fetched)
        mergeMonthMeals(lastYear, lastMonth, fetched)
        markLoaded(lastYear, lastMonth)
      }),
    ])
      .catch((err: unknown) => {
        console.error('[meals] boot fetch failed:', err instanceof Error ? err.message : err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      })
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  /** Lazy-load a month on demand; no-op if already loaded or already fetching. month is 0-indexed. */
  const fetchMonth = useCallback(
    async (year: number, month0: number) => {
      const key = monthKey(year, month0)
      if (loadedMonthsRef.current.has(key)) return
      if (fetchingMonthsRef.current.has(key)) return
      fetchingMonthsRef.current.add(key)
      setFetchingMonths(new Set(fetchingMonthsRef.current))
      try {
        const fetched = await api.fetchMealsByMonth(year, month0)
        writeMonthCache(year, month0, fetched)
        mergeMonthMeals(year, month0, fetched)
        markLoaded(year, month0)
      } catch (err) {
        console.error('[meals] fetchMonth failed:', key, err instanceof Error ? err.message : err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        fetchingMonthsRef.current.delete(key)
        setFetchingMonths(new Set(fetchingMonthsRef.current))
      }
    },
    [mergeMonthMeals, markLoaded]
  )

  /** Force re-fetch a specific month (pull-to-refresh). Defaults to current calendar month. */
  const refetch = useCallback(
    async (year?: number, month0?: number) => {
      const y = year ?? new Date().getFullYear()
      const m = month0 ?? new Date().getMonth()
      setError(null)
      try {
        const fetched = await api.fetchMealsByMonth(y, m)
        writeMonthCache(y, m, fetched)
        mergeMonthMeals(y, m, fetched)
        markLoaded(y, m)
      } catch (err) {
        console.error('[meals] refetch failed:', err instanceof Error ? err.message : err)
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    },
    [mergeMonthMeals, markLoaded]
  )

  const addMeal = useCallback(async (payload: CreateMealPayload) => {
    const meal = await api.createMeal(payload)
    setMeals((prev) => [meal, ...prev])
    // Update cached earliest month if this meal is older than what's stored
    const mealMonth = monthKey(
      new Date(meal.occurredAt).getFullYear(),
      new Date(meal.occurredAt).getMonth()
    )
    const cached = localStorage.getItem(CACHE_KEYS.EARLIEST_MONTH)
    if (!cached || mealMonth < cached) {
      localStorage.setItem(CACHE_KEYS.EARLIEST_MONTH, mealMonth)
    }
    return meal
  }, [])

  const updateMeal = useCallback(
    async (id: string, payload: Parameters<typeof api.updateMeal>[1]) => {
      const updated = await api.updateMeal(id, payload)
      setMeals((prev) => prev.map((m) => (m.id === id ? updated : m)))
      return updated
    },
    []
  )

  const deleteMeal = useCallback(
    async (id: string) => {
      // Capture the meal's month before deletion to check if the cache needs clearing
      const deletedMeal = meals.find((m) => m.id === id)
      await api.deleteMeal(id)
      setMeals((prev) => prev.filter((m) => m.id !== id))
      // If the deleted meal's month matches the cached earliest month, clear the
      // cache so it gets re-fetched from the server next time.
      if (deletedMeal) {
        const deletedMonth = monthKey(
          new Date(deletedMeal.occurredAt).getFullYear(),
          new Date(deletedMeal.occurredAt).getMonth()
        )
        const cached = localStorage.getItem(CACHE_KEYS.EARLIEST_MONTH)
        if (cached && deletedMonth <= cached) {
          localStorage.removeItem(CACHE_KEYS.EARLIEST_MONTH)
        }
      }
    },
    [meals]
  )

  const value = useMemo(
    () => ({
      meals,
      loading,
      error,
      loadedMonths,
      fetchingMonths,
      fetchMonth,
      refetch,
      addMeal,
      updateMeal,
      deleteMeal,
    }),
    [
      meals,
      loading,
      error,
      loadedMonths,
      fetchingMonths,
      fetchMonth,
      refetch,
      addMeal,
      updateMeal,
      deleteMeal,
    ]
  )

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>
}
