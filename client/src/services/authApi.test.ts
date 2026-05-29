import * as authApi from './authApi'

vi.stubGlobal('fetch', vi.fn())

function mockResponse(body: unknown, ok = true): Response {
  return {
    ok,
    text: vi.fn().mockResolvedValue(JSON.stringify(body)),
  } as unknown as Response
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authApi', () => {
  describe('register', () => {
    it('sends register request and returns user data', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ user: { email: 'test@example.com' } }))

      const result = await authApi.register('test@example.com', 'password')

      expect(result).toEqual({ email: 'test@example.com' })
      expect(fetch).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      )
    })

    it('throws error when request fails', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Email already exists' }, false))

      await expect(authApi.register('test@example.com', 'password')).rejects.toThrow(
        'Email already exists'
      )
    })

    it('throws generic error when no error message provided', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({}, false))

      await expect(authApi.register('test@example.com', 'password')).rejects.toThrow(
        'Request failed'
      )
    })

    it('throws generic error when response body is empty', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue(''),
      } as unknown as Response)

      await expect(authApi.register('test@example.com', 'password')).rejects.toThrow(
        'Request failed'
      )
    })

    it('throws generic error when response body is non-JSON', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        text: vi.fn().mockResolvedValue('<html>Not Found</html>'),
      } as unknown as Response)

      await expect(authApi.register('test@example.com', 'password')).rejects.toThrow(
        'Request failed'
      )
    })
  })

  describe('login', () => {
    it('sends login request and returns user data', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ user: { email: 'test@example.com' } }))

      const result = await authApi.login('test@example.com', 'password')

      expect(result).toEqual({ email: 'test@example.com' })
      expect(fetch).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      )
    })

    it('throws error when login fails', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Invalid credentials' }, false))

      await expect(authApi.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })
  })

  describe('logout', () => {
    it('sends logout request', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({}))

      await authApi.logout()

      expect(fetch).toHaveBeenCalledWith(
        '/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('throws error when logout fails', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Logout failed' }, false))

      await expect(authApi.logout()).rejects.toThrow('Logout failed')
    })
  })

  describe('migrateDevice', () => {
    it('sends migrate request with device id', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({}))

      await authApi.migrateDevice('device-123')

      expect(fetch).toHaveBeenCalledWith(
        '/auth/migrate',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ deviceId: 'device-123' }),
        })
      )
    })

    it('throws error when migrate fails', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Migration failed' }, false))

      await expect(authApi.migrateDevice('device-123')).rejects.toThrow('Migration failed')
    })
  })

  describe('refreshSession', () => {
    it('returns user data when refresh succeeds', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(mockResponse({}))
        }
        return Promise.resolve(mockResponse({ user: { email: 'test@example.com' } }))
      })

      const result = await authApi.refreshSession()

      expect(result).toEqual({ email: 'test@example.com' })
      expect(fetch).toHaveBeenCalledTimes(2)
      const calls = vi.mocked(fetch).mock.calls
      expect(calls[0][0]).toBe('/auth/refresh')
      expect(calls[1][0]).toBe('/auth/me')
    })

    it('returns null when refresh fails', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ error: 'Refresh failed' }, false))

      const result = await authApi.refreshSession()

      expect(result).toBeNull()
    })

    it('returns null when me endpoint fails', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve(mockResponse({}))
        }
        return Promise.resolve(mockResponse({ error: 'Not authenticated' }, false))
      })

      const result = await authApi.refreshSession()

      expect(result).toBeNull()
    })
  })

  describe('request headers', () => {
    it('includes credentials and content-type headers', async () => {
      vi.mocked(fetch).mockResolvedValue(mockResponse({ user: { email: 'test@example.com' } }))

      await authApi.login('test@example.com', 'password')

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        })
      )
    })
  })
})
