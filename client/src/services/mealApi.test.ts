vi.mock('../utils/imageUtils', () => ({ compressImage: (file: File) => Promise.resolve(file) }))

import {
  ping,
  fetchMealsByMonth,
  fetchEarliestMonth,
  createMeal,
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
    status: ok ? 200 : 400,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response)
}

describe('ping', () => {
  it('does not throw when fetch succeeds', () => {
    mockFetch({})
    expect(() => ping()).not.toThrow()
  })

  it('does not throw when fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))
    expect(() => ping()).not.toThrow()
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
})

describe('fetchMealsByMonth', () => {
  it('calls GET /meals?month=YYYY-MM and returns normalized meals', async () => {
    mockFetch({ meals: [{ _id: 'abc', tag: 'CLEAN' }] })

    // month0=4 → May (0-indexed) → ?month=2026-05
    const result = await fetchMealsByMonth(2026, 4)

    expect(fetch).toHaveBeenCalledWith('/meals?month=2026-05', expect.objectContaining({}))
    expect(result).toEqual([{ _id: 'abc', tag: 'CLEAN', id: 'abc' }])
  })

  it('converts January correctly (month0=0 → ?month=YYYY-01)', async () => {
    mockFetch({ meals: [] })

    await fetchMealsByMonth(2026, 0)

    expect(fetch).toHaveBeenCalledWith('/meals?month=2026-01', expect.objectContaining({}))
  })

  it('converts December correctly (month0=11 → ?month=YYYY-12)', async () => {
    mockFetch({ meals: [] })

    await fetchMealsByMonth(2025, 11)

    expect(fetch).toHaveBeenCalledWith('/meals?month=2025-12', expect.objectContaining({}))
  })

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'DB connection lost' }, false)

    await expect(fetchMealsByMonth(2026, 4)).rejects.toThrow('DB connection lost')
  })
})

describe('fetchEarliestMonth', () => {
  it('returns the earliestMonth string from the response', async () => {
    mockFetch({ earliestMonth: '2026-01' })

    const result = await fetchEarliestMonth()

    expect(fetch).toHaveBeenCalledWith('/meals/earliest', expect.objectContaining({}))
    expect(result).toBe('2026-01')
  })

  it('returns null when the response contains null', async () => {
    mockFetch({ earliestMonth: null })

    const result = await fetchEarliestMonth()

    expect(result).toBeNull()
  })

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'Unauthorized' }, false)

    await expect(fetchEarliestMonth()).rejects.toThrow('Unauthorized')
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
    expect(options.credentials).toBe('include')
    const form = options.body as FormData
    expect(form.get('tag')).toBe('CLEAN')
    expect(form.get('image')).toBeTruthy()
    expect(result).toMatchObject({ id: 'xyz', tag: 'CLEAN' })
  })

  it('appends note and amountSpent when provided', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({ meal: { _id: 'xyz', tag: 'INDULGENT', occurredAt: 0, imageUrl: null } })

    await createMeal({
      image: file,
      tag: 'INDULGENT',
      occurredAt: 0,
      note: 'Lunch',
      amountSpent: 350,
    })

    const form = (vi.mocked(fetch).mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(form.get('note')).toBe('Lunch')
    expect(form.get('amountSpent')).toBe('350')
  })

  it('omits note and amountSpent when null', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({ meal: { _id: 'xyz', tag: 'CLEAN', occurredAt: 0, imageUrl: null } })

    await createMeal({ image: file, tag: 'CLEAN', occurredAt: 0, note: null, amountSpent: null })

    const form = (vi.mocked(fetch).mock.calls[0] as [string, RequestInit])[1].body as FormData
    expect(form.get('note')).toBeNull()
    expect(form.get('amountSpent')).toBeNull()
  })

  it('throws on non-ok response', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({ error: 'Upload failed' }, false)

    await expect(createMeal({ image: file, tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Upload failed'
    )
  })

  it('falls back to "Request failed" when server sends no error field', async () => {
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })
    mockFetch({}, false)

    await expect(createMeal({ image: file, tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Request failed'
    )
  })
})

describe('updateMeal', () => {
  it('PATCHes to /meals/:id with JSON body and returns the normalized meal', async () => {
    const payload = { tag: 'INDULGENT' as const, amountSpent: 250 }
    mockFetch({ meal: { _id: 'abc', occurredAt: 0, ...payload } })

    const result = await updateMeal('abc', payload)

    expect(fetch).toHaveBeenCalledWith(
      '/meals/abc',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(payload),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
    expect(result).toMatchObject({ id: 'abc', tag: 'INDULGENT' })
  })
})

describe('empty response body', () => {
  it('request: handles empty body without throwing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    const result = await fetchEarliestMonth()
    expect(result).toBeUndefined()
  })

  it('createMeal: falls back to "Request failed" on empty error body', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(createMeal({ image: file, tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Request failed'
    )
  })
})

describe('non-JSON response handling', () => {
  it('request: logs and throws on non-JSON error response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue('<html>Service Unavailable</html>'),
    } as unknown as Response)

    await expect(fetchMealsByMonth(2026, 4)).rejects.toThrow('Request failed')
    expect(console.error).toHaveBeenCalledWith(
      '[mealApi] non-JSON response from',
      expect.any(String),
      'status:',
      expect.anything(),
      'body:',
      expect.any(String)
    )
    vi.mocked(console.error).mockRestore()
  })

  it('createMeal: logs and throws on non-JSON error response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue('<html>Service Unavailable</html>'),
    } as unknown as Response)
    const file = new File(['img'], 'photo.jpg', { type: 'image/jpeg' })

    await expect(createMeal({ image: file, tag: 'CLEAN', occurredAt: 0 })).rejects.toThrow(
      'Request failed'
    )
    expect(console.error).toHaveBeenCalledWith(
      '[mealApi] non-JSON response from createMeal, status:',
      expect.anything(),
      'body:',
      expect.any(String)
    )
    vi.mocked(console.error).mockRestore()
  })
})

describe('deleteMeal', () => {
  it('sends DELETE to /meals/:id', async () => {
    mockFetch({})

    await deleteMeal('abc')

    expect(fetch).toHaveBeenCalledWith('/meals/abc', expect.objectContaining({ method: 'DELETE' }))
  })

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'Meal not found' }, false)

    await expect(deleteMeal('abc')).rejects.toThrow('Meal not found')
  })
})
