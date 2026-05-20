import { createMeal, getMeals, getMealsByDate, updateMeal, deleteMeal } from './mealService'

jest.mock('../models/Meal')
import Meal from '../models/Meal'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createMeal', () => {
  it('calls Meal.create with the correct fields and returns the result', async () => {
    const fakeMeal = { _id: '123', tag: 'INDULGENT', amountSpent: 300, occurredAt: 1700000000000 }
    jest.mocked(Meal.create).mockResolvedValue(fakeMeal as any)

    const result = await createMeal('user-123', {
      imageUrl: 'https://example.com/img.jpg',
      tag: 'INDULGENT',
      amountSpent: 300,
      note: 'Lunch',
      occurredAt: 1700000000000,
    })

    expect(Meal.create).toHaveBeenCalledWith({
      userId: 'user-123',
      imageUrl: 'https://example.com/img.jpg',
      tag: 'INDULGENT',
      amountSpent: 300,
      note: 'Lunch',
      occurredAt: 1700000000000,
    })
    expect(result).toBe(fakeMeal)
  })

  it('throws if occurredAt is missing', async () => {
    await expect(createMeal('user-123', { tag: 'CLEAN' })).rejects.toThrow('occurredAt is required')
    expect(Meal.create).not.toHaveBeenCalled()
  })

  it('passes amountSpent through for CLEAN meals', async () => {
    jest.mocked(Meal.create).mockResolvedValue({} as any)

    await createMeal('user-123', { tag: 'CLEAN', amountSpent: 500, occurredAt: 1700000000000 })

    expect(Meal.create).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'CLEAN', amountSpent: 500 })
    )
  })

  it('passes amountSpent through for OUTSIDE meals', async () => {
    jest.mocked(Meal.create).mockResolvedValue({} as any)

    await createMeal('user-123', { tag: 'INDULGENT', amountSpent: 250, occurredAt: 1700000000000 })

    expect(Meal.create).toHaveBeenCalledWith(
      expect.objectContaining({ tag: 'INDULGENT', amountSpent: 250 })
    )
  })

  it('defaults imageUrl and note to null when omitted', async () => {
    jest.mocked(Meal.create).mockResolvedValue({} as any)

    await createMeal('user-123', { tag: 'CLEAN', occurredAt: 1700000000000 })

    expect(Meal.create).toHaveBeenCalledWith(
      expect.objectContaining({ imageUrl: null, note: null })
    )
  })
})

describe('getMeals', () => {
  it('queries by userId and sorts by occurredAt descending', async () => {
    const fakeMeals = [{ _id: '1' }, { _id: '2' }]
    const mockSort = jest.fn().mockResolvedValue(fakeMeals)
    jest.mocked(Meal.find).mockReturnValue({ sort: mockSort } as any)

    const result = await getMeals('user-123')

    expect(Meal.find).toHaveBeenCalledWith({ userId: 'user-123' })
    expect(mockSort).toHaveBeenCalledWith({ occurredAt: -1 })
    expect(result).toBe(fakeMeals)
  })
})

describe('getMealsByDate', () => {
  it('queries with the correct start/end timestamps for the given date', async () => {
    const fakeMeals = [{ _id: '1' }]
    const mockSort = jest.fn().mockResolvedValue(fakeMeals)
    jest.mocked(Meal.find).mockReturnValue({ sort: mockSort } as any)

    const dateString = '2024-06-15'
    const result = await getMealsByDate('user-123', dateString)

    const [year, month, day] = dateString.split('-').map(Number)
    const expectedStart = new Date(year, month - 1, day, 0, 0, 0, 0).getTime()
    const expectedEnd = new Date(year, month - 1, day, 23, 59, 59, 999).getTime()

    expect(Meal.find).toHaveBeenCalledWith({
      userId: 'user-123',
      occurredAt: { $gte: expectedStart, $lte: expectedEnd },
    })
    expect(mockSort).toHaveBeenCalledWith({ occurredAt: -1 })
    expect(result).toBe(fakeMeals)
  })

  it('throws if the date string is not in YYYY-MM-DD format', async () => {
    await expect(getMealsByDate('user-123', '15-06-2024')).rejects.toThrow(
      'date must be in YYYY-MM-DD format'
    )
    await expect(getMealsByDate('user-123', 'not-a-date')).rejects.toThrow(
      'date must be in YYYY-MM-DD format'
    )
    expect(Meal.find).not.toHaveBeenCalled()
  })
})

describe('updateMeal', () => {
  it('calls findOneAndUpdate with correct query, updates, and options, then returns the meal', async () => {
    const fakeMeal = { _id: 'abc', tag: 'INDULGENT', amountSpent: 200 }
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(fakeMeal as any)

    const result = await updateMeal('user-123', 'abc', {
      tag: 'INDULGENT',
      amountSpent: 200,
      note: 'Dinner',
    })

    expect(Meal.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'abc', userId: 'user-123' },
      { tag: 'INDULGENT', amountSpent: 200, note: 'Dinner' },
      { new: true, runValidators: true }
    )
    expect(result).toBe(fakeMeal)
  })

  it('throws "Meal not found" when findOneAndUpdate returns null', async () => {
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(null)

    await expect(updateMeal('user-123', 'nonexistent', { tag: 'CLEAN' })).rejects.toThrow(
      'Meal not found'
    )
  })

  it('allows null amountSpent for OUTSIDE meals', async () => {
    const fakeMeal = { _id: 'abc', tag: 'INDULGENT', amountSpent: null }
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(fakeMeal as any)

    const result = await updateMeal('user-123', 'abc', { tag: 'INDULGENT', amountSpent: null })

    expect(Meal.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ tag: 'INDULGENT', amountSpent: null }),
      expect.anything()
    )
    expect(result).toBe(fakeMeal)
  })

  it('passes amountSpent through for CLEAN meals', async () => {
    jest
      .mocked(Meal.findOneAndUpdate)
      .mockResolvedValue({ _id: 'abc', tag: 'CLEAN', amountSpent: 500 } as any)

    await updateMeal('user-123', 'abc', { tag: 'CLEAN', amountSpent: 500 })

    expect(Meal.findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ amountSpent: 500 }),
      expect.anything()
    )
  })
})

describe('deleteMeal', () => {
  it('calls findOneAndDelete with the correct filter and returns true', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue({ _id: 'abc' } as any)

    const result = await deleteMeal('user-123', 'abc')

    expect(Meal.findOneAndDelete).toHaveBeenCalledWith({ _id: 'abc', userId: 'user-123' })
    expect(result).toBe(true)
  })

  it('throws "Meal not found" when findOneAndDelete returns null', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue(null)

    await expect(deleteMeal('user-123', 'nonexistent')).rejects.toThrow('Meal not found')
  })
})
