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
    status: ok ? 200 : 400,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response)
}

describe('fetchSettings', () => {
  it('calls GET /settings and returns the settings object', async () => {
    const fakeSettings = { userId: 'user-123', currentMonthlyLimit: 7 }
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
      currentMonthlyLimit: 10,
    }
    mockFetch({ settings: fakeSettings })

    const result = await saveSettings(10)

    expect(fetch).toHaveBeenCalledWith(
      '/settings',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currentMonthlyLimit: 10 }),
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

describe('empty response body', () => {
  it('handles empty body without throwing', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      status: 204,
      text: vi.fn().mockResolvedValue(''),
    } as unknown as Response)

    const result = await fetchSettings()
    expect(result).toBeUndefined()
  })
})

describe('non-JSON response handling', () => {
  it('logs and throws on non-JSON error response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 503,
      text: vi.fn().mockResolvedValue('<html>Service Unavailable</html>'),
    } as unknown as Response)

    await expect(fetchSettings()).rejects.toThrow('Request failed')
    expect(console.error).toHaveBeenCalledWith(
      '[settingsApi] non-JSON response from',
      expect.any(String),
      'status:',
      expect.anything(),
      'body:',
      expect.any(String)
    )
    vi.mocked(console.error).mockRestore()
  })
})
