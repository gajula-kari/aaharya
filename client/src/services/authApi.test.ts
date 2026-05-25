import * as authApi from './authApi'

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('authApi', () => {
  describe('register', () => {
    it('sends register request and returns user data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ user: { email: 'test@example.com', displayName: 'Test' } }),
      } as unknown as Response)

      const result = await authApi.register('test@example.com', 'password', 'Test')

      expect(result).toEqual({ email: 'test@example.com', displayName: 'Test' })
      expect(fetch).toHaveBeenCalledWith(
        '/auth/register',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            password: 'password',
            displayName: 'Test',
          }),
        })
      )
    })

    it('throws error when request fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Email already exists' }),
      } as unknown as Response)

      await expect(authApi.register('test@example.com', 'password', 'Test')).rejects.toThrow(
        'Email already exists'
      )
    })

    it('throws generic error when no error message provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)

      await expect(authApi.register('test@example.com', 'password', 'Test')).rejects.toThrow(
        'Request failed'
      )
    })
  })

  describe('login', () => {
    it('sends login request and returns user data', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ user: { email: 'test@example.com', displayName: 'Test' } }),
      } as unknown as Response)

      const result = await authApi.login('test@example.com', 'password')

      expect(result).toEqual({ email: 'test@example.com', displayName: 'Test' })
      expect(fetch).toHaveBeenCalledWith(
        '/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      )
    })

    it('throws error when login fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Invalid credentials' }),
      } as unknown as Response)

      await expect(authApi.login('test@example.com', 'wrong')).rejects.toThrow(
        'Invalid credentials'
      )
    })
  })

  describe('logout', () => {
    it('sends logout request', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)

      await authApi.logout()

      expect(fetch).toHaveBeenCalledWith(
        '/auth/logout',
        expect.objectContaining({
          method: 'POST',
        })
      )
    })

    it('throws error when logout fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Logout failed' }),
      } as unknown as Response)

      await expect(authApi.logout()).rejects.toThrow('Logout failed')
    })
  })

  describe('migrateDevice', () => {
    it('sends migrate request with device id', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response)

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
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Migration failed' }),
      } as unknown as Response)

      await expect(authApi.migrateDevice('device-123')).rejects.toThrow('Migration failed')
    })
  })

  describe('refreshSession', () => {
    it('returns user data when refresh succeeds', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({}),
          } as unknown as Response)
        }
        return Promise.resolve({
          ok: true,
          json: vi
            .fn()
            .mockResolvedValue({ user: { email: 'test@example.com', displayName: 'Test' } }),
        } as unknown as Response)
      })

      const result = await authApi.refreshSession()

      expect(result).toEqual({ email: 'test@example.com', displayName: 'Test' })
      expect(fetch).toHaveBeenCalledTimes(2)
      const calls = vi.mocked(fetch).mock.calls
      expect(calls[0][0]).toBe('/auth/refresh')
      expect(calls[1][0]).toBe('/auth/me')
    })

    it('returns null when refresh fails', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        json: vi.fn().mockResolvedValue({ error: 'Refresh failed' }),
      } as unknown as Response)

      const result = await authApi.refreshSession()

      expect(result).toBeNull()
    })

    it('returns null when me endpoint fails', async () => {
      let callCount = 0
      vi.mocked(fetch).mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: vi.fn().mockResolvedValue({}),
          } as unknown as Response)
        }
        return Promise.resolve({
          ok: false,
          json: vi.fn().mockResolvedValue({ error: 'Not authenticated' }),
        } as unknown as Response)
      })

      const result = await authApi.refreshSession()

      expect(result).toBeNull()
    })
  })

  describe('request headers', () => {
    it('includes credentials and content-type headers', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue({ user: { email: 'test@example.com', displayName: 'Test' } }),
      } as unknown as Response)

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
