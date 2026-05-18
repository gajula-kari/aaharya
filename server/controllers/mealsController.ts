import { type Request, type Response } from 'express'
import {
  createMeal,
  getMeals,
  getMealsByDate,
  updateMeal,
  deleteMeal,
} from '../services/mealService'
import { uploadImage } from '../services/uploadService'

function getUserId(req: Request, res: Response): string | null {
  const userId = req.headers['x-user-id']
  if (!userId || typeof userId !== 'string') {
    res.status(400).json({ error: 'x-user-id header is required' })
    return null
  }
  return userId
}

export async function createMealController(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req, res)
  if (!userId) return
  try {
    const imageUrl = req.file ? await uploadImage(req.file.buffer) : null
    const meal = await createMeal(userId, {
      tag: req.body.tag,
      occurredAt: Number(req.body.occurredAt),
      note: req.body.note || null,
      amountSpent:
        req.body.amountSpent != null && req.body.amountSpent !== ''
          ? Number(req.body.amountSpent)
          : undefined,
      imageUrl,
    })
    res.status(201).json({ meal })
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
}

export async function getMealsController(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req, res)
  if (!userId) return
  try {
    const { date } = req.query as { date?: string }
    const meals = date ? await getMealsByDate(userId, date) : await getMeals(userId)
    res.json({ meals })
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
}

export async function updateMealController(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req, res)
  if (!userId) return
  try {
    const meal = await updateMeal(userId, req.params['id'] as string, req.body)
    res.json({ meal })
  } catch (err) {
    if ((err as Error).message === 'Meal not found') {
      res.status(404).json({ error: (err as Error).message })
      return
    }
    res.status(400).json({ error: (err as Error).message })
  }
}

export async function deleteMealController(req: Request, res: Response): Promise<void> {
  const userId = getUserId(req, res)
  if (!userId) return
  try {
    await deleteMeal(userId, req.params['id'] as string)
    res.json({ success: true })
  } catch (err) {
    if ((err as Error).message === 'Meal not found') {
      res.status(404).json({ error: (err as Error).message })
      return
    }
    res.status(400).json({ error: (err as Error).message })
  }
}
