vi.mock('../utils/deviceId', () => ({ getDeviceId: () => 'test-device-id' }))
vi.mock('../utils/imageUtils', () => ({ compressImage: (file: File) => Promise.resolve(file) }))

import {
  fetchMeals,
  createMeal,
  createMealRecord,
  uploadMealImage,
  updateMeal,
  deleteMeal,
} from './mealApi'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function mockFetch(body: unknown, ok = true) {
  vi.mocked(fetch).mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response)
}

describe('fetchMeals', () => {
  it('calls GET /meals and returns normalized meals', async () => {
    mockFetch({ meals: [{ _id: 'abc', tag: 'CLEAN' }] })

    const result = await fetchMeals()

    expect(fetch).toHaveBeenCalledWith('/meals', expect.objectContaining({}))
    expect(result).toEqual([{ _id: 'abc', tag: 'CLEAN', id: 'abc' }])
  })

  it('throws with the server error message on non-ok response', async () => {
    mockFetch({ error: 'DB connection lost' }, false)

    await expect(fetchMeals()).rejects.toThrow('DB connection lost')
  })

  it('falls back to "Request failed" when server sends no error field', async () => {
    mockFetch({}, false)

    await expect(fetchMeals()).rejects.toThrow('Request failed')
  })
})

describe('createMeal', () => {
  it('POSTs to /meals as FormData with compressed image and returns the normalized meal', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({
      meal: {
        _id: 'xyz',
        tag: 'CLEAN',
        occurredAt: 1700000000000,
        imageUrl: 'https://cdn/img.jpg',
      },
    })

    const result = await createMeal({ image: file, tag: 'CLEAN', occurredAt: 1700000000000 })

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/meals')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    const form = options.body as FormData
    expect(form.get('tag')).toBe('CLEAN')
    expect(form.get('image')).toBeTruthy()
    expect(result).toMatchObject({ id: 'xyz', tag: 'CLEAN' })
  })

  it('throws on non-ok response', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({ error: 'Upload failed' }, false)

    await expect(createMeal({ image: file, tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Upload failed'
    )
  })
})

describe('createMealRecord', () => {
  it('POSTs to /meals as FormData without image and returns the normalized meal', async () => {
    const payload = { tag: 'CLEAN' as const, occurredAt: 1700000000000 }
    mockFetch({ meal: { _id: 'xyz', tag: 'CLEAN', occurredAt: 1700000000000, imageUrl: null } })

    const result = await createMealRecord(payload)

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/meals')
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.headers as Record<string, string>)['x-user-id']).toBe('test-device-id')

    const form = options.body as FormData
    expect(form.get('tag')).toBe('CLEAN')
    expect(form.get('occurredAt')).toBe('1700000000000')
    expect(form.get('image')).toBeNull()
    expect(result).toMatchObject({ id: 'xyz', tag: 'CLEAN' })
  })

  it('appends note and amountSpent when provided', async () => {
    mockFetch({ meal: { _id: 'xyz', tag: 'INDULGENT', occurredAt: 0, imageUrl: null } })

    await createMealRecord({ tag: 'INDULGENT', occurredAt: 0, note: 'Lunch', amountSpent: 350 })

    const form = (vi.mocked(fetch).mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(form.get('note')).toBe('Lunch')
    expect(form.get('amountSpent')).toBe('350')
  })

  it('omits note and amountSpent when null', async () => {
    mockFetch({ meal: { _id: 'xyz', tag: 'CLEAN', occurredAt: 0, imageUrl: null } })

    await createMealRecord({ tag: 'CLEAN', occurredAt: 0, note: null, amountSpent: null })

    const form = (vi.mocked(fetch).mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(form.get('note')).toBeNull()
    expect(form.get('amountSpent')).toBeNull()
  })

  it('throws "Request failed" when server sends no error field', async () => {
    mockFetch({}, false)

    await expect(createMealRecord({ tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Request failed'
    )
  })
})

describe('uploadMealImage', () => {
  it('PATCHes to /meals/:id/image as FormData and returns the normalized meal', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({
      meal: { _id: 'xyz', tag: 'CLEAN', occurredAt: 0, imageUrl: 'https://cdn/img.jpg' },
    })

    const result = await uploadMealImage('xyz', file)

    const [url, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/meals/xyz/image')
    expect(options.method).toBe('PATCH')
    expect(options.body).toBeInstanceOf(FormData)
    expect((options.headers as Record<string, string>)['x-user-id']).toBe('test-device-id')
    expect(result).toMatchObject({ id: 'xyz', imageUrl: 'https://cdn/img.jpg' })
  })

  it('throws on non-ok response', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({ error: 'Upload failed' }, false)

    await expect(uploadMealImage('xyz', file)).rejects.toThrow('Upload failed')
  })
})

describe('updateMeal', () => {
  it('PATCHes to /api/meals/:id with JSON body and returns the normalized meal', async () => {
    const payload = { tag: 'INDULGENT' as const, amountSpent: 250 }
    mockFetch({ meal: { _id: 'abc', occurredAt: 0, ...payload } })

    const result = await updateMeal('abc', payload)

    expect(fetch).toHaveBeenCalledWith(
      '/meals/abc',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'x-user-id': 'test-device-id' }),
      })
    )
    expect(result).toMatchObject({ id: 'abc', tag: 'INDULGENT' })
  })
})

describe('deleteMeal', () => {
  it('sends DELETE to /api/meals/:id', async () => {
    mockFetch({})

    await deleteMeal('abc')

    expect(fetch).toHaveBeenCalledWith('/meals/abc', expect.objectContaining({ method: 'DELETE' }))
  })

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'Meal not found' }, false)

    await expect(deleteMeal('abc')).rejects.toThrow('Meal not found')
  })
})
