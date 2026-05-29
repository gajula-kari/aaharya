import { type Request, type Response } from 'express'
import {
  createMealController,
  getMealsController,
  getEarliestMealController,
  updateMealController,
  deleteMealController,
} from './mealsController'

jest.mock('../services/mealService')
jest.mock('../services/uploadService')
import {
  createMeal,
  getMealsByDate,
  getMealsByMonth,
  getEarliestMealMonth,
  updateMeal,
  deleteMeal,
} from '../services/mealService'
import { uploadImage } from '../services/uploadService'

type MockRes = { status: jest.Mock; json: jest.Mock }

function makeReq(
  options: {
    body?: Record<string, unknown>
    params?: Record<string, string>
    query?: Record<string, string>
    headers?: Record<string, string>
    file?: Express.Multer.File
    user?: { userId: string; email?: string }
  } = {}
): Request {
  const {
    body = {},
    params = {},
    query = {},
    headers = {},
    file,
    user = { userId: USER_ID, email: '' },
  } = options
  return { body, params, query, headers, file, user } as unknown as Request
}

function makeRes(): MockRes {
  const res: MockRes = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

const USER_ID = 'device-uuid-123'
const withUser = { 'x-user-id': USER_ID }

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createMealController', () => {
  const fakeFile = { buffer: Buffer.from('img') } as Express.Multer.File
  const UPLOADED_URL = 'https://res.cloudinary.com/test/image/upload/aaharya/abc.jpg'

  beforeEach(() => {
    jest.mocked(uploadImage).mockResolvedValue(UPLOADED_URL)
  })

  it('responds 201 with the created meal on success', async () => {
    const fakeMeal = { _id: 'abc', tag: 'CLEAN', occurredAt: 1700000000000 }
    jest.mocked(createMeal).mockResolvedValue(fakeMeal as any)

    const req = makeReq({
      headers: withUser,
      body: { tag: 'CLEAN', occurredAt: '1700000000000', note: 'Lunch', amountSpent: '' },
      file: fakeFile,
    })
    const res = makeRes()

    await createMealController(req, res as unknown as Response)

    expect(uploadImage).toHaveBeenCalledWith(fakeFile.buffer)
    expect(createMeal).toHaveBeenCalledWith(USER_ID, {
      tag: 'CLEAN',
      occurredAt: 1700000000000,
      note: 'Lunch',
      amountSpent: undefined,
      imageUrl: UPLOADED_URL,
    })
    expect(res.status).toHaveBeenCalledWith(201)
    expect(res.json).toHaveBeenCalledWith({ meal: fakeMeal })
  })

  it('parses amountSpent as a number when provided', async () => {
    jest.mocked(createMeal).mockResolvedValue({} as any)

    const req = makeReq({
      headers: withUser,
      body: { tag: 'INDULGENT', occurredAt: '1700000000000', amountSpent: '350' },
      file: fakeFile,
    })
    const res = makeRes()

    await createMealController(req, res as unknown as Response)

    expect(createMeal).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ amountSpent: 350 }))
  })

  it('sets imageUrl to null when no file is uploaded', async () => {
    jest.mocked(createMeal).mockResolvedValue({} as any)

    const req = makeReq({ headers: withUser, body: { tag: 'CLEAN', occurredAt: 1700000000000 } })
    const res = makeRes()

    await createMealController(req, res as unknown as Response)

    expect(uploadImage).not.toHaveBeenCalled()
    expect(createMeal).toHaveBeenCalledWith(USER_ID, expect.objectContaining({ imageUrl: null }))
  })

  it('responds 400 when the upload throws', async () => {
    jest.mocked(uploadImage).mockRejectedValue(new Error('Upload failed'))

    const req = makeReq({
      headers: withUser,
      body: { tag: 'CLEAN', occurredAt: 1700000000000 },
      file: fakeFile,
    })
    const res = makeRes()

    await createMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'Upload failed' })
  })

  it('responds 400 with the error message when the service throws', async () => {
    jest.mocked(createMeal).mockRejectedValue(new Error('occurredAt is required'))

    const req = makeReq({ headers: withUser, body: {}, file: fakeFile })
    const res = makeRes()

    await createMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'occurredAt is required' })
  })
})

describe('getMealsController', () => {
  it('responds 400 when no query params are given', async () => {
    const req = makeReq({ headers: withUser })
    const res = makeRes()

    await getMealsController(req, res as unknown as Response)

    expect(getMealsByDate).not.toHaveBeenCalled()
    expect(getMealsByMonth).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'year and month are required' })
  })

  it('calls getMealsByDate() with userId and date string when date query param is present', async () => {
    const fakeMeals = [{ _id: '3' }]
    jest.mocked(getMealsByDate).mockResolvedValue(fakeMeals as any)

    const req = makeReq({ headers: withUser, query: { date: '2024-06-15' } })
    const res = makeRes()

    await getMealsController(req, res as unknown as Response)

    expect(getMealsByDate).toHaveBeenCalledWith(USER_ID, '2024-06-15')
    expect(getMealsByMonth).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ meals: fakeMeals })
  })

  it('calls getMealsByMonth() when year and month query params are present', async () => {
    const fakeMeals = [{ _id: '4' }]
    jest.mocked(getMealsByMonth).mockResolvedValue(fakeMeals as any)

    const req = makeReq({ headers: withUser, query: { year: '2026', month: '5' } })
    const res = makeRes()

    await getMealsController(req, res as unknown as Response)

    expect(getMealsByMonth).toHaveBeenCalledWith(USER_ID, 2026, 5)
    expect(getMealsByDate).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ meals: fakeMeals })
  })

  it('responds 400 when month is out of range', async () => {
    const req = makeReq({ headers: withUser, query: { year: '2026', month: '13' } })
    const res = makeRes()

    await getMealsController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(getMealsByMonth).not.toHaveBeenCalled()
  })

  it('responds 400 when getMealsByDate throws', async () => {
    jest.mocked(getMealsByDate).mockRejectedValue(new Error('date must be in YYYY-MM-DD format'))

    const req = makeReq({ headers: withUser, query: { date: 'not-a-date' } })
    const res = makeRes()

    await getMealsController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'date must be in YYYY-MM-DD format' })
  })
})

describe('getEarliestMealController', () => {
  it('responds with the earliest meal month when meals exist', async () => {
    jest.mocked(getEarliestMealMonth).mockResolvedValue('2026-01')

    const req = makeReq({ headers: withUser })
    const res = makeRes()

    await getEarliestMealController(req, res as unknown as Response)

    expect(getEarliestMealMonth).toHaveBeenCalledWith(USER_ID)
    expect(res.json).toHaveBeenCalledWith({ earliestMonth: '2026-01' })
  })

  it('responds with null when no meals exist', async () => {
    jest.mocked(getEarliestMealMonth).mockResolvedValue(null)

    const req = makeReq({ headers: withUser })
    const res = makeRes()

    await getEarliestMealController(req, res as unknown as Response)

    expect(res.json).toHaveBeenCalledWith({ earliestMonth: null })
  })

  it('responds 500 on DB error', async () => {
    jest.mocked(getEarliestMealMonth).mockRejectedValue(new Error('DB connection lost'))

    const req = makeReq({ headers: withUser })
    const res = makeRes()

    await getEarliestMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection lost' })
  })
})

describe('updateMealController', () => {
  it('responds 200 with the updated meal on success', async () => {
    const fakeMeal = { _id: 'abc', tag: 'INDULGENT', amountSpent: 350 }
    jest.mocked(updateMeal).mockResolvedValue(fakeMeal as any)

    const req = makeReq({
      headers: withUser,
      params: { id: 'abc' },
      body: { tag: 'INDULGENT', amountSpent: 350 },
    })
    const res = makeRes()

    await updateMealController(req, res as unknown as Response)

    expect(updateMeal).toHaveBeenCalledWith(USER_ID, 'abc', req.body)
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ meal: fakeMeal })
  })

  it('responds 404 when the service throws "Meal not found"', async () => {
    jest.mocked(updateMeal).mockRejectedValue(new Error('Meal not found'))

    const req = makeReq({
      headers: withUser,
      params: { id: 'nonexistent' },
      body: { tag: 'CLEAN' },
    })
    const res = makeRes()

    await updateMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
  })

  it('responds 400 for any other service error', async () => {
    jest.mocked(updateMeal).mockRejectedValue(new Error('DB connection lost'))

    const req = makeReq({ headers: withUser, params: { id: 'abc' }, body: { tag: 'INDULGENT' } })
    const res = makeRes()

    await updateMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection lost' })
  })
})

describe('deleteMealController', () => {
  it('responds { success: true } on successful delete', async () => {
    jest.mocked(deleteMeal).mockResolvedValue(true)

    const req = makeReq({ headers: withUser, params: { id: 'abc' } })
    const res = makeRes()

    await deleteMealController(req, res as unknown as Response)

    expect(deleteMeal).toHaveBeenCalledWith(USER_ID, 'abc')
    expect(res.status).not.toHaveBeenCalled()
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('responds 404 when the service throws "Meal not found"', async () => {
    jest.mocked(deleteMeal).mockRejectedValue(new Error('Meal not found'))

    const req = makeReq({ headers: withUser, params: { id: 'ghost-id' } })
    const res = makeRes()

    await deleteMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({ error: 'Meal not found' })
  })

  it('responds 400 for any other service error', async () => {
    jest.mocked(deleteMeal).mockRejectedValue(new Error('DB connection lost'))

    const req = makeReq({ headers: withUser, params: { id: 'abc' } })
    const res = makeRes()

    await deleteMealController(req, res as unknown as Response)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ error: 'DB connection lost' })
  })
})
