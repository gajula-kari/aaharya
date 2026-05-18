import Meal, { type MealTag } from '../models/Meal'

export interface CreateMealInput {
  imageUrl?: string | null
  tag: MealTag
  amountSpent?: number | null
  note?: string | null
  occurredAt?: number
}

export interface UpdateMealInput {
  tag: MealTag
  amountSpent?: number | null
  note?: string | null
}

export async function createMeal(userId: string, input: CreateMealInput) {
  if (!input.occurredAt) {
    throw new Error('occurredAt is required')
  }

  const meal = await Meal.create({
    userId,
    imageUrl: input.imageUrl ?? null,
    tag: input.tag,
    amountSpent: input.amountSpent ?? null,
    note: input.note ?? null,
    occurredAt: input.occurredAt,
  })

  return meal
}

export async function getMeals(userId: string) {
  return Meal.find({ userId }).sort({ occurredAt: -1 })
}

export async function getMealsByDate(userId: string, dateString: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    throw new Error('date must be in YYYY-MM-DD format')
  }

  const [year, month, day] = dateString.split('-').map(Number)
  const start = new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
  const end = new Date(year, month - 1, day, 23, 59, 59, 999).getTime()

  return Meal.find({
    userId,
    occurredAt: { $gte: start, $lte: end },
  }).sort({ occurredAt: -1 })
}

export async function updateMeal(userId: string, mealId: string, input: UpdateMealInput) {
  const updates = {
    tag: input.tag,
    amountSpent: input.amountSpent ?? null,
    note: input.note ?? null,
  }

  const meal = await Meal.findOneAndUpdate({ _id: mealId, userId }, updates, {
    new: true,
    runValidators: true,
  })

  if (!meal) {
    throw new Error('Meal not found')
  }

  return meal
}

export async function updateMealImage(userId: string, mealId: string, imageUrl: string) {
  const meal = await Meal.findOneAndUpdate(
    { _id: mealId, userId },
    { imageUrl },
    { new: true, runValidators: true }
  )
  if (!meal) throw new Error('Meal not found')
  return meal
}

export async function deleteMeal(userId: string, mealId: string) {
  const meal = await Meal.findOneAndDelete({ _id: mealId, userId })
  if (!meal) {
    throw new Error('Meal not found')
  }
  return true
}
