import type { Meal, CreateMealPayload, UpdateMealPayload, MealTag } from '../types'
import { compressImage } from '../utils/imageUtils'

const ROOT = import.meta.env.VITE_API_URL ?? ''
const BASE = `${ROOT}/meals`

export function ping(): void {
  fetch(`${ROOT}/health`).catch(() => {})
}

interface RawMeal {
  _id: string
  tag: MealTag
  imageUrl: string | null
  amountSpent: number | null
  note: string | null
  occurredAt: number
  userId?: string
  date?: string
  createdAt?: number
  updatedAt?: number
}

function normalize(raw: RawMeal): Meal {
  return { ...raw, id: raw._id }
}

async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let data: { error?: string } = {}
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      console.error(
        '[mealApi] non-JSON response from',
        url,
        'status:',
        res.status,
        'body:',
        text.slice(0, 100)
      )
    }
  }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

/** Fetch meals for a single calendar month. month0 is 0-indexed (JS Date convention). */
export async function fetchMealsByMonth(year: number, month0: number): Promise<Meal[]> {
  const month = `${year}-${String(month0 + 1).padStart(2, '0')}`
  const data = (await request(`${BASE}?month=${month}`)) as { meals: RawMeal[] }
  return data.meals.map(normalize)
}

/** Returns the earliest "YYYY-MM" string the user has a meal in, or null. */
export async function fetchEarliestMonth(): Promise<string | null> {
  const data = (await request(`${BASE}/earliest`)) as { earliestMonth: string | null }
  return data.earliestMonth
}

// Full synchronous save — metadata + image in one request
export async function createMeal(payload: CreateMealPayload): Promise<Meal> {
  const form = new FormData()
  const compressed = await compressImage(payload.image)
  form.append('image', compressed, 'meal.jpg')
  form.append('tag', payload.tag)
  form.append('occurredAt', String(payload.occurredAt))
  if (payload.note != null) form.append('note', payload.note)
  if (payload.amountSpent != null) form.append('amountSpent', String(payload.amountSpent))

  const res = await fetch(BASE, {
    method: 'POST',
    credentials: 'include',
    body: form,
  })
  let data: { error?: string; meal: RawMeal } = {} as { error?: string; meal: RawMeal }
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string; meal: RawMeal }
    } catch {
      console.error(
        '[mealApi] non-JSON response from createMeal, status:',
        res.status,
        'body:',
        text.slice(0, 100)
      )
    }
  }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return normalize(data.meal)
}

export async function updateMeal(id: string, payload: UpdateMealPayload): Promise<Meal> {
  const data = (await request(`${BASE}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })) as { meal: RawMeal }
  return normalize(data.meal)
}

export async function deleteMeal(id: string): Promise<void> {
  await request(`${BASE}/${id}`, { method: 'DELETE' })
}
