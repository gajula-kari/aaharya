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

export interface GoalHistoryEntry {
  goal: number
  month: string // "YYYY-MM"
}

export interface Settings {
  monthlyIndulgentLimit: number | null
  goalHistory?: GoalHistoryEntry[]
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
  /** "YYYY-MM" keys of months whose data has been fetched from the server this session */
  loadedMonths: Set<string>
  /** Lazy-load a month on demand; no-op if already loaded. month is 0-indexed. */
  fetchMonth: (year: number, month: number) => Promise<void>
  /** Force re-fetch a month (pull-to-refresh). Defaults to current calendar month. month is 0-indexed. */
  refetch: (year?: number, month?: number) => Promise<void>
  addMeal: (payload: CreateMealPayload) => Promise<Meal>
  updateMeal: (id: string, payload: UpdateMealPayload) => Promise<Meal>
  deleteMeal: (id: string) => Promise<void>
}
