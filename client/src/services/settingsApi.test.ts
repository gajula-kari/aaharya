vi.mock('../utils/deviceId', () => ({ getDeviceId: () => 'test-device-id' }))

import { fetchSettings, saveSettings } from './settingsApi'

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

describe('fetchSettings', () => {
  it('calls GET /settings and returns the settings object', async () => {
    const fakeSettings = { userId: 'user-123', monthlyIndulgentLimit: 7 }
    mockFetch({ settings: fakeSettings })

    const result = await fetchSettings()

    expect(fetch).toHaveBeenCalledWith('/settings', expect.objectContaining({}))
    expect(result).toEqual(fakeSettings)
  })

  it('returns null when no settings exist yet', async () => {
    mockFetch({ settings: null })

    const result = await fetchSettings()

    expect(result).toBeNull()
  })

  it('throws with the server error message on non-ok response', async () => {
    mockFetch({ error: 'Server error' }, false)

    await expect(fetchSettings()).rejects.toThrow('Server error')
  })
})

describe('saveSettings', () => {
  it('sends PATCH /settings with the goal and returns updated settings', async () => {
    const fakeSettings = {
      userId: 'user-123',
      monthlyIndulgentLimit: 10,
      goalUpdatedAt: 1700000000000,
    }
    mockFetch({ settings: fakeSettings })

    const result = await saveSettings(10)

    expect(fetch).toHaveBeenCalledWith(
      '/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ monthlyIndulgentLimit: 10 }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      })
    )
    expect(result).toEqual(fakeSettings)
  })

  it('throws with the server error message on non-ok response', async () => {
    mockFetch({ error: 'Failed to save' }, false)

    await expect(saveSettings(10)).rejects.toThrow('Failed to save')
  })

  it('falls back to "Request failed" when server sends no error field', async () => {
    mockFetch({}, false)

    await expect(saveSettings(10)).rejects.toThrow('Request failed')
  })
})

describe('fetchSettings error fallback', () => {
  it('falls back to "Request failed" when server sends no error field', async () => {
    mockFetch({}, false)

    await expect(fetchSettings()).rejects.toThrow('Request failed')
  })
})
