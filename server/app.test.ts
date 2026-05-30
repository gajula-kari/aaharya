import request from 'supertest'
import app from './app'
import { generateAccessToken } from './services/tokenService'

jest.mock('./models/Meal')
import Meal from './models/Meal'

jest.mock('./models/UserSettings')
import UserSettings from './models/UserSettings'

jest.mock('./models/EventLog', () => ({
  __esModule: true,
  INSTALL_EVENTS: ['banner_shown', 'banner_dismissed', 'standalone_visit'],
  default: { create: jest.fn() },
}))
import EventLog from './models/EventLog'

// Generate a valid JWT for integration tests using the test secret from jest.setup.ts
const TEST_TOKEN = generateAccessToken({ userId: 'user-test', email: '' })
const authCookie = `accessToken=${TEST_TOKEN}`

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-05-15'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('POST /meals', () => {
  it('returns 201 with the created meal', async () => {
    const fakeMeal = { _id: 'abc', tag: 'HOME', occurredAt: 1700000000000 }
    jest.mocked(Meal.create).mockResolvedValue(fakeMeal as any)

    const res = await request(app)
      .post('/meals')
      .set('Cookie', authCookie)
      .send({ tag: 'HOME', occurredAt: 1700000000000 })
      .expect(201)

    expect(res.body).toEqual({ meal: fakeMeal })
  })

  it('returns 400 when occurredAt is missing', async () => {
    const res = await request(app)
      .post('/meals')
      .set('Cookie', authCookie)
      .send({ tag: 'HOME' })
      .expect(400)

    expect(res.body).toEqual({ error: 'occurredAt is required' })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app)
      .post('/meals')
      .send({ tag: 'HOME', occurredAt: 1700000000000 })
      .expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('GET /meals', () => {
  it('returns 400 when no query params are given', async () => {
    const res = await request(app).get('/meals').set('Cookie', authCookie).expect(400)

    expect(res.body).toEqual({ error: 'year and month are required' })
  })

  it('returns 200 with filtered meals when date query param is given', async () => {
    const fakeMeals = [{ _id: '3' }]
    jest.mocked(Meal.find).mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeMeals) } as any)

    const res = await request(app)
      .get('/meals')
      .set('Cookie', authCookie)
      .query({ date: '2024-06-15' })
      .expect(200)

    expect(res.body).toEqual({ meals: fakeMeals })
  })

  it('returns 400 when the date format is invalid', async () => {
    const res = await request(app)
      .get('/meals')
      .set('Cookie', authCookie)
      .query({ date: 'not-a-date' })
      .expect(400)

    expect(res.body).toEqual({ error: 'date must be in YYYY-MM-DD format' })
  })

  it('returns 200 with meals filtered by ?month=YYYY-MM', async () => {
    const fakeMeals = [{ _id: '1' }]
    jest.mocked(Meal.find).mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeMeals) } as any)

    const res = await request(app)
      .get('/meals')
      .set('Cookie', authCookie)
      .query({ month: '2026-05' })
      .expect(200)

    expect(res.body).toEqual({ meals: fakeMeals })
  })

  it('returns 400 when month is out of range', async () => {
    await request(app)
      .get('/meals')
      .set('Cookie', authCookie)
      .query({ month: '2026-13' })
      .expect(400)
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).get('/meals').expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('GET /meals/earliest', () => {
  it('returns 200 with the earliest month when meals exist', async () => {
    const fakeMeal = { occurredAt: new Date('2026-01-15').getTime() }
    jest.mocked(Meal.findOne).mockReturnValue({
      sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(fakeMeal) }),
    } as any)

    const res = await request(app).get('/meals/earliest').set('Cookie', authCookie).expect(200)

    expect(res.body).toEqual({ earliestMonth: '2026-01' })
  })

  it('returns 200 with null when no meals exist', async () => {
    jest.mocked(Meal.findOne).mockReturnValue({
      sort: jest.fn().mockReturnValue({ select: jest.fn().mockResolvedValue(null) }),
    } as any)

    const res = await request(app).get('/meals/earliest').set('Cookie', authCookie).expect(200)

    expect(res.body).toEqual({ earliestMonth: null })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).get('/meals/earliest').expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('PATCH /meals/:id', () => {
  it('returns 200 with the updated meal', async () => {
    const fakeMeal = { _id: 'abc', tag: 'OUTSIDE', amountSpent: 200 }
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(fakeMeal as any)

    const res = await request(app)
      .patch('/meals/abc')
      .set('Cookie', authCookie)
      .send({ tag: 'OUTSIDE', amountSpent: 200 })
      .expect(200)

    expect(res.body).toEqual({ meal: fakeMeal })
  })

  it('returns 404 when the meal does not exist', async () => {
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(null)

    const res = await request(app)
      .patch('/meals/nonexistent')
      .set('Cookie', authCookie)
      .send({ tag: 'HOME' })
      .expect(404)

    expect(res.body).toEqual({ error: 'Meal not found' })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).patch('/meals/abc').send({ tag: 'HOME' }).expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('DELETE /meals/:id', () => {
  it('returns 200 with { success: true }', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue({ _id: 'abc' } as any)

    const res = await request(app).delete('/meals/abc').set('Cookie', authCookie).expect(200)

    expect(res.body).toEqual({ success: true })
  })

  it('returns 404 when the meal does not exist', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue(null)

    const res = await request(app)
      .delete('/meals/nonexistent')
      .set('Cookie', authCookie)
      .expect(404)

    expect(res.body).toEqual({ error: 'Meal not found' })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).delete('/meals/abc').expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('GET /settings', () => {
  it('returns 200 with settings when a record exists', async () => {
    const fakeSettings = { userId: 'user-test', currentMonthlyLimit: 7 }
    jest.mocked(UserSettings.findOne).mockResolvedValue(fakeSettings as any)

    const res = await request(app).get('/settings').set('Cookie', authCookie).expect(200)

    expect(res.body).toEqual({ settings: fakeSettings })
  })

  it('returns 200 with null when no settings have been saved yet', async () => {
    jest.mocked(UserSettings.findOne).mockResolvedValue(null)

    const res = await request(app).get('/settings').set('Cookie', authCookie).expect(200)

    expect(res.body).toEqual({ settings: null })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).get('/settings').expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('PATCH /settings', () => {
  it('returns 200 with the upserted settings', async () => {
    const fakeSettings = {
      userId: 'user-test',
      currentMonthlyLimit: 7,
      goalHistory: [{ goal: 7, month: '2026-05' }],
    }
    jest.mocked(UserSettings.findOne).mockResolvedValue(null)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(fakeSettings as any)

    const res = await request(app)
      .patch('/settings')
      .set('Cookie', authCookie)
      .send({ currentMonthlyLimit: 7 })
      .expect(200)

    expect(res.body).toEqual({ settings: fakeSettings })
  })

  it('stores goal in goalHistory when the goal changes in a new month', async () => {
    const existing = {
      userId: 'user-test',
      currentMonthlyLimit: 5,
      goalHistory: [{ goal: 5, month: '2026-04' }],
    }
    const updated = {
      userId: 'user-test',
      currentMonthlyLimit: 10,
      goalHistory: [
        { goal: 5, month: '2026-04' },
        { goal: 10, month: '2026-05' },
      ],
    }
    jest.mocked(UserSettings.findOne).mockResolvedValue(existing as any)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(updated as any)

    const res = await request(app)
      .patch('/settings')
      .set('Cookie', authCookie)
      .send({ currentMonthlyLimit: 10 })
      .expect(200)

    expect(res.body).toEqual({ settings: updated })
    const setArg = (jest.mocked(UserSettings.findOneAndUpdate).mock.calls[0]?.[1] as any)?.$set
    expect(setArg).toMatchObject({
      currentMonthlyLimit: 10,
      goalHistory: [
        { goal: 5, month: '2026-04' },
        { goal: 10, month: '2026-05' },
      ],
    })
  })

  it('replaces goalHistory entry when goal changes in the same month', async () => {
    const existing = {
      userId: 'user-test',
      currentMonthlyLimit: 5,
      goalHistory: [{ goal: 5, month: '2026-05' }],
    }
    jest.mocked(UserSettings.findOne).mockResolvedValue(existing as any)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(existing as any)

    await request(app)
      .patch('/settings')
      .set('Cookie', authCookie)
      .send({ currentMonthlyLimit: 10 })
      .expect(200)

    const setArg = (jest.mocked(UserSettings.findOneAndUpdate).mock.calls[0]?.[1] as any)?.$set
    expect(setArg).toMatchObject({
      goalHistory: [{ goal: 10, month: '2026-05' }],
    })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).patch('/settings').send({ currentMonthlyLimit: 7 }).expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })
})

describe('GET /health', () => {
  it('returns { status: "ok" }', async () => {
    const res = await request(app).get('/health').expect(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})

describe('CORS (production)', () => {
  afterEach(() => {
    process.env.NODE_ENV = 'test'
    delete process.env.CLIENT_URL
  })

  it('allows requests from CLIENT_URL origins and trims whitespace', async () => {
    process.env.NODE_ENV = 'production'
    process.env.CLIENT_URL = 'https://app.example.com , https://stage.example.com'

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://stage.example.com')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBe('https://stage.example.com')
  })

  it('blocks requests from origins not in CLIENT_URL', async () => {
    process.env.NODE_ENV = 'production'
    process.env.CLIENT_URL = 'https://app.example.com'

    const res = await request(app)
      .options('/health')
      .set('Origin', 'https://evil.com')
      .set('Access-Control-Request-Method', 'GET')

    expect(res.headers['access-control-allow-origin']).toBeUndefined()
  })

  it('succeeds when no Origin header is sent in production (covers requestOrigin ?? "" branch)', async () => {
    process.env.NODE_ENV = 'production'
    process.env.CLIENT_URL = 'https://app.example.com'

    const res = await request(app).get('/health')

    expect(res.status).toBeGreaterThanOrEqual(200)
    expect(res.status).toBeLessThan(300)
  })
})

describe('POST /events', () => {
  it('returns 201 when a valid event is logged', async () => {
    jest.mocked(EventLog.create).mockResolvedValue({} as any)

    const res = await request(app)
      .post('/events')
      .set('Cookie', authCookie)
      .send({ event: 'banner_shown' })
      .expect(201)

    expect(res.body).toEqual({ ok: true })
    expect(EventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-test', event: 'banner_shown' })
    )
  })

  it('accepts all valid event types', async () => {
    jest.mocked(EventLog.create).mockResolvedValue({} as any)

    for (const event of ['banner_shown', 'banner_dismissed', 'standalone_visit']) {
      await request(app).post('/events').set('Cookie', authCookie).send({ event }).expect(201)
    }
  })

  it('returns 400 when event is invalid', async () => {
    const res = await request(app)
      .post('/events')
      .set('Cookie', authCookie)
      .send({ event: 'unknown_event' })
      .expect(400)

    expect(res.body).toEqual({ error: 'invalid event' })
  })

  it('returns 400 when event is missing', async () => {
    const res = await request(app).post('/events').set('Cookie', authCookie).send({}).expect(400)

    expect(res.body).toEqual({ error: 'invalid event' })
  })

  it('returns 401 when no auth cookie is present', async () => {
    const res = await request(app).post('/events').send({ event: 'banner_shown' }).expect(401)

    expect(res.body).toEqual({ error: 'Unauthorized' })
  })

  it('returns 500 when EventLog.create throws', async () => {
    jest.mocked(EventLog.create).mockRejectedValue(new Error('DB write failed'))

    const res = await request(app)
      .post('/events')
      .set('Cookie', authCookie)
      .send({ event: 'banner_shown' })
      .expect(500)

    expect(res.body).toHaveProperty('error')
  })
})
