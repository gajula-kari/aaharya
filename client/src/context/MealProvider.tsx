import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MealContext } from './MealContext'
import * as api from '../services/mealApi'
import type { CreateMealPayload, Meal } from '../types'

const CACHE_KEY = 'aaharya_meals'

function readCache(): Meal[] | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return raw ? (JSON.parse(raw) as Meal[]) : null
  } catch {
    return null
  }
}

function writeCache(meals: Meal[]): void {
  try {
    // imageUrl excluded — not needed for streak/calendar and keeps the cache small.
    const slim = meals.map(({ imageUrl: _, ...rest }) => rest)
    localStorage.setItem(CACHE_KEY, JSON.stringify(slim))
  } catch {
    // localStorage unavailable (private browsing quota) — silently skip
  }
}

export function MealProvider({ children }: { children: ReactNode }) {
  const [meals, setMeals] = useState<Meal[]>(() => readCache() ?? [])
  const [loading, setLoading] = useState(() => {
    const cache = readCache()
    return !cache || cache.length === 0
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    writeCache(meals)
  }, [meals])

  useEffect(() => {
    api.ping()
    api
      .fetchMeals()
      .then(setMeals)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
      .finally(() => setLoading(false))
  }, [])

  const refetch = useCallback(async () => {
    setError(null)
    await api
      .fetchMeals()
      .then(setMeals)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Unknown error'))
  }, [])

  const addMeal = useCallback(async (payload: CreateMealPayload) => {
    const meal = await api.createMeal(payload)
    setMeals((prev) => [meal, ...prev])
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

  const deleteMeal = useCallback(async (id: string) => {
    await api.deleteMeal(id)
    setMeals((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const value = useMemo(
    () => ({ meals, loading, error, addMeal, updateMeal, deleteMeal, refetch }),
    [meals, loading, error, addMeal, updateMeal, deleteMeal, refetch]
  )

  return <MealContext.Provider value={value}>{children}</MealContext.Provider>
}
