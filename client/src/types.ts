export const MEAL_TAG = {
  CLEAN: 'CLEAN',
  INDULGENT: 'INDULGENT',
} as const

export type MealTag = (typeof MEAL_TAG)[keyof typeof MEAL_TAG]

export interface Meal {
  id: string
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

export interface Settings {
  monthlyIndulgentLimit: number | null
  previousGoal?: number | null
  goalUpdatedAt?: number | null
  userId?: string
}

export interface CreateMealPayload {
  image: File
  tag: MealTag
  occurredAt: number
  note?: string | null
  amountSpent?: number | null
}

export interface UpdateMealPayload {
  tag?: MealTag
  note?: string | null
  amountSpent?: number | null
}

export interface MealContextValue {
  meals: Meal[]
  loading: boolean
  error: string | null
  addMeal: (payload: CreateMealPayload) => Promise<Meal>
  updateMeal: (id: string, payload: UpdateMealPayload) => Promise<Meal>
  deleteMeal: (id: string) => Promise<void>
}
