import { type Request, type Response } from 'express'
import {
  createMeal,
  getMealsByDate,
  getMealsByMonth,
  getEarliestMealMonth,
  updateMeal,
  deleteMeal,
} from '../services/mealService'
import { uploadImage } from '../services/uploadService'

export async function createMealController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
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
  const { userId } = req.user!
  try {
    const { date, month } = req.query as { date?: string; month?: string }

    let meals
    if (month != null && /^\d{4}-\d{2}$/.test(month)) {
      const [y, m] = month.split('-').map(Number)
      if (m < 1 || m > 12) {
        res.status(400).json({ error: 'month must be a valid YYYY-MM string (month: 01–12)' })
        return
      }
      meals = await getMealsByMonth(userId, y, m)
    } else if (date) {
      meals = await getMealsByDate(userId, date)
    } else {
      res.status(400).json({ error: 'year and month are required' })
      return
    }

    res.json({ meals })
  } catch (err) {
    res.status(400).json({ error: (err as Error).message })
  }
}

export async function getEarliestMealController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  try {
    const earliestMonth = await getEarliestMealMonth(userId)
    res.json({ earliestMonth })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}

export async function updateMealController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
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
  const { userId } = req.user!
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
