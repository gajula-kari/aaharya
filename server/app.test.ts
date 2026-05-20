import request from 'supertest'
import app from './app'

jest.mock('./models/Meal')
import Meal from './models/Meal'

jest.mock('./models/UserSettings')
import UserSettings from './models/UserSettings'

jest.mock('./models/EventLog')
import EventLog from './models/EventLog'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /meals', () => {
  it('returns 201 with the created meal', async () => {
    const fakeMeal = { _id: 'abc', tag: 'HOME', occurredAt: 1700000000000 }
    jest.mocked(Meal.create).mockResolvedValue(fakeMeal as any)

    const res = await request(app)
      .post('/meals')
      .set('x-user-id', 'user-test')
      .send({ tag: 'HOME', occurredAt: 1700000000000 })
      .expect(201)

    expect(res.body).toEqual({ meal: fakeMeal })
  })

  it('returns 400 when occurredAt is missing', async () => {
    const res = await request(app)
      .post('/meals')
      .set('x-user-id', 'user-test')
      .send({ tag: 'HOME' })
      .expect(400)

    expect(res.body).toEqual({ error: 'occurredAt is required' })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app)
      .post('/meals')
      .send({ tag: 'HOME', occurredAt: 1700000000000 })
      .expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})

describe('GET /meals', () => {
  it('returns 200 with all meals when no date query param', async () => {
    const fakeMeals = [{ _id: '1' }, { _id: '2' }]
    jest.mocked(Meal.find).mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeMeals) } as any)

    const res = await request(app).get('/meals').set('x-user-id', 'user-test').expect(200)

    expect(res.body).toEqual({ meals: fakeMeals })
  })

  it('returns 200 with filtered meals when date query param is given', async () => {
    const fakeMeals = [{ _id: '3' }]
    jest.mocked(Meal.find).mockReturnValue({ sort: jest.fn().mockResolvedValue(fakeMeals) } as any)

    const res = await request(app)
      .get('/meals')
      .set('x-user-id', 'user-test')
      .query({ date: '2024-06-15' })
      .expect(200)

    expect(res.body).toEqual({ meals: fakeMeals })
  })

  it('returns 400 when the date format is invalid', async () => {
    const res = await request(app)
      .get('/meals')
      .set('x-user-id', 'user-test')
      .query({ date: 'not-a-date' })
      .expect(400)

    expect(res.body).toEqual({ error: 'date must be in YYYY-MM-DD format' })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).get('/meals').expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})

describe('PATCH /meals/:id', () => {
  it('returns 200 with the updated meal', async () => {
    const fakeMeal = { _id: 'abc', tag: 'OUTSIDE', amountSpent: 200 }
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(fakeMeal as any)

    const res = await request(app)
      .patch('/meals/abc')
      .set('x-user-id', 'user-test')
      .send({ tag: 'OUTSIDE', amountSpent: 200 })
      .expect(200)

    expect(res.body).toEqual({ meal: fakeMeal })
  })

  it('returns 404 when the meal does not exist', async () => {
    jest.mocked(Meal.findOneAndUpdate).mockResolvedValue(null)

    const res = await request(app)
      .patch('/meals/nonexistent')
      .set('x-user-id', 'user-test')
      .send({ tag: 'HOME' })
      .expect(404)

    expect(res.body).toEqual({ error: 'Meal not found' })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).patch('/meals/abc').send({ tag: 'HOME' }).expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})

describe('DELETE /meals/:id', () => {
  it('returns 200 with { success: true }', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue({ _id: 'abc' } as any)

    const res = await request(app).delete('/meals/abc').set('x-user-id', 'user-test').expect(200)

    expect(res.body).toEqual({ success: true })
  })

  it('returns 404 when the meal does not exist', async () => {
    jest.mocked(Meal.findOneAndDelete).mockResolvedValue(null)

    const res = await request(app)
      .delete('/meals/nonexistent')
      .set('x-user-id', 'user-test')
      .expect(404)

    expect(res.body).toEqual({ error: 'Meal not found' })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).delete('/meals/abc').expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})

describe('GET /settings', () => {
  it('returns 200 with settings when a record exists', async () => {
    const fakeSettings = { userId: 'user-test', monthlyIndulgentLimit: 7 }
    jest.mocked(UserSettings.findOne).mockResolvedValue(fakeSettings as any)

    const res = await request(app).get('/settings').set('x-user-id', 'user-test').expect(200)

    expect(res.body).toEqual({ settings: fakeSettings })
  })

  it('returns 200 with null when no settings have been saved yet', async () => {
    jest.mocked(UserSettings.findOne).mockResolvedValue(null)

    const res = await request(app).get('/settings').set('x-user-id', 'user-test').expect(200)

    expect(res.body).toEqual({ settings: null })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).get('/settings').expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})

describe('PATCH /settings', () => {
  it('returns 200 with the upserted settings', async () => {
    const fakeSettings = {
      userId: 'user-test',
      monthlyIndulgentLimit: 7,
      goalUpdatedAt: 1700000000000,
    }
    jest.mocked(UserSettings.findOne).mockResolvedValue(null)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(fakeSettings as any)

    const res = await request(app)
      .patch('/settings')
      .set('x-user-id', 'user-test')
      .send({ monthlyIndulgentLimit: 7 })
      .expect(200)

    expect(res.body).toEqual({ settings: fakeSettings })
  })

  it('stores the old goal as previousGoal when the goal changes', async () => {
    const existing = { userId: 'user-test', monthlyIndulgentLimit: 5 }
    const updated = { userId: 'user-test', monthlyIndulgentLimit: 10, previousGoal: 5 }
    jest.mocked(UserSettings.findOne).mockResolvedValue(existing as any)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(updated as any)

    const res = await request(app)
      .patch('/settings')
      .set('x-user-id', 'user-test')
      .send({ monthlyIndulgentLimit: 10 })
      .expect(200)

    expect(res.body).toEqual({ settings: updated })
    const setArg = (jest.mocked(UserSettings.findOneAndUpdate).mock.calls[0]?.[1] as any)?.$set
    expect(setArg).toMatchObject({ previousGoal: 5, monthlyIndulgentLimit: 10 })
  })

  it('does not set previousGoal when the goal is unchanged', async () => {
    const existing = { userId: 'user-test', monthlyIndulgentLimit: 7 }
    jest.mocked(UserSettings.findOne).mockResolvedValue(existing as any)
    jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(existing as any)

    await request(app)
      .patch('/settings')
      .set('x-user-id', 'user-test')
      .send({ monthlyIndulgentLimit: 7 })
      .expect(200)

    const setArg = (jest.mocked(UserSettings.findOneAndUpdate).mock.calls[0]?.[1] as any)?.$set
    expect(setArg).not.toHaveProperty('previousGoal')
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).patch('/settings').send({ monthlyIndulgentLimit: 7 }).expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
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
})

describe('POST /events', () => {
  it('returns 201 when a valid event is logged', async () => {
    jest.mocked(EventLog.create).mockResolvedValue({} as any)

    const res = await request(app)
      .post('/events')
      .set('x-user-id', 'user-test')
      .send({ event: 'install_clicked' })
      .expect(201)

    expect(res.body).toEqual({ ok: true })
    expect(EventLog.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-test', event: 'install_clicked' })
    )
  })

  it('accepts all valid event types', async () => {
    jest.mocked(EventLog.create).mockResolvedValue({} as any)

    for (const event of ['install_clicked', 'app_installed', 'standalone_visit']) {
      await request(app).post('/events').set('x-user-id', 'user-test').send({ event }).expect(201)
    }
  })

  it('returns 400 when event is invalid', async () => {
    const res = await request(app)
      .post('/events')
      .set('x-user-id', 'user-test')
      .send({ event: 'unknown_event' })
      .expect(400)

    expect(res.body).toEqual({ error: 'invalid event' })
  })

  it('returns 400 when event is missing', async () => {
    const res = await request(app)
      .post('/events')
      .set('x-user-id', 'user-test')
      .send({})
      .expect(400)

    expect(res.body).toEqual({ error: 'invalid event' })
  })

  it('returns 400 when x-user-id header is missing', async () => {
    const res = await request(app).post('/events').send({ event: 'install_clicked' }).expect(400)

    expect(res.body).toEqual({ error: 'x-user-id header is required' })
  })
})
