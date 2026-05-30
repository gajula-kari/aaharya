import { type Request, type Response } from 'express'
import {
  register,
  login,
  anonymous,
  refresh,
  me,
  logout,
  migrate,
  googleCallback,
} from './authController'
import * as authService from '../services/authService'
import * as tokenService from '../services/tokenService'
import * as migrateService from '../services/migrateService'

jest.mock('../services/authService')
jest.mock('../services/tokenService')
jest.mock('../services/migrateService')

type MockRes = {
  status: jest.Mock
  json: jest.Mock
  redirect: jest.Mock
  cookie: jest.Mock
  clearCookie: jest.Mock
}

function makeRes(): MockRes {
  const res: MockRes = {
    status: jest.fn(),
    json: jest.fn(),
    redirect: jest.fn(),
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CLIENT_URL = 'http://localhost:3000'
})

describe('authController', () => {
  describe('register', () => {
    it('creates new user and issues session', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.registerUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
        cookies: {},
      } as unknown as Request
      const res = makeRes()

      await register(req, res as unknown as Response)

      expect(authService.registerUser).toHaveBeenCalledWith(
        'test@example.com',
        'password123',
        undefined
      )
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(res, 'access123', 'refresh123')
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ user: { email: 'test@example.com' } })
    })

    it('returns 400 when email is missing', async () => {
      const req = { body: { password: 'password123' } } as unknown as Request
      const res = makeRes()

      await register(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' })
      expect(authService.registerUser).not.toHaveBeenCalled()
    })

    it('returns 400 when password is missing', async () => {
      const req = { body: { email: 'test@example.com' } } as unknown as Request
      const res = makeRes()

      await register(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Email and password are required' })
    })

    it('returns 400 with friendly error when registration fails', async () => {
      jest.mocked(authService.registerUser).mockRejectedValue(new Error('EMAIL_TAKEN'))

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      } as unknown as Request
      const res = makeRes()

      await register(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({
        error: 'An account with this email already exists',
      })
    })

    it('returns 400 with fallback message for unknown error codes', async () => {
      jest.mocked(authService.registerUser).mockRejectedValue(new Error('UNEXPECTED_ERROR'))

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      } as unknown as Request
      const res = makeRes()

      await register(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'Something went wrong. Try again.' })
    })
  })

  describe('login', () => {
    it('logs in user and issues session', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.loginUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
      } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(authService.loginUser).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(res, 'access123', 'refresh123')
      expect(res.json).toHaveBeenCalledWith({ user: { email: 'test@example.com' } })
    })

    it('returns 400 when email is missing', async () => {
      const req = { body: { password: 'password123' } } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'email and password are required' })
    })

    it('returns 401 when login fails', async () => {
      jest.mocked(authService.loginUser).mockRejectedValue(new Error('INVALID_PASSWORD'))

      const req = {
        body: { email: 'test@example.com', password: 'wrongpassword' },
      } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Incorrect password' })
    })

    it('returns 401 with EMAIL_NOT_FOUND error key when email is not registered', async () => {
      jest.mocked(authService.loginUser).mockRejectedValue(new Error('EMAIL_NOT_FOUND'))

      const req = {
        body: { email: 'nobody@example.com', password: 'password123' },
      } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'EMAIL_NOT_FOUND' })
    })

    it('migrates anonymous meals when an anonymous cookie is present', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.loginUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue({
        userId: 'anon-123',
        email: '',
        isAnonymous: true,
      })
      jest.mocked(migrateService.migrateDeviceData).mockResolvedValue(0 as never)

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
        cookies: { accessToken: 'anon-token' },
      } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(migrateService.migrateDeviceData).toHaveBeenCalledWith('anon-123', 'user-123')
    })

    it('does not migrate when cookie has a non-anonymous token', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.loginUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')
      // verifyAccessToken returns a real-user payload (isAnonymous = false)
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue({
        userId: 'real-user-456',
        email: 'other@example.com',
      })

      const req = {
        body: { email: 'test@example.com', password: 'password123' },
        cookies: { accessToken: 'real-token' },
      } as unknown as Request
      const res = makeRes()

      await login(req, res as unknown as Response)

      expect(migrateService.migrateDeviceData).not.toHaveBeenCalled()
    })
  })

  describe('refresh', () => {
    it('rotates refresh token and returns new tokens', async () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(payload)
      jest.mocked(tokenService.rotateRefreshToken).mockResolvedValue('newrefresh123')
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('newaccess123')

      const req = {
        cookies: {
          refreshToken: 'oldrefresh123',
          accessToken:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSJ9.test',
        },
      } as unknown as Request
      const res = makeRes()

      await refresh(req, res as unknown as Response)

      expect(tokenService.rotateRefreshToken).toHaveBeenCalledWith('oldrefresh123', 'user-123')
      expect(tokenService.setAuthCookies).toHaveBeenCalledWith(res, 'newaccess123', 'newrefresh123')
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('returns 401 when refresh token is missing', async () => {
      const req = { cookies: {} } as unknown as Request
      const res = makeRes()

      await refresh(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'No refresh token' })
    })

    it('returns 401 when access token payload cannot be extracted', async () => {
      const req = {
        cookies: { refreshToken: 'oldrefresh123' },
      } as unknown as Request
      const res = makeRes()

      await refresh(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
    })

    it('clears cookies and returns 401 when token rotation fails', async () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const validToken = Buffer.from(JSON.stringify(payload)).toString('base64')
      jest.mocked(tokenService.rotateRefreshToken).mockResolvedValue(null)

      const req = {
        cookies: {
          refreshToken: 'oldrefresh123',
          accessToken: `header.${validToken}.signature`,
        },
      } as unknown as Request
      const res = makeRes()

      await refresh(req, res as unknown as Response)

      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res)
      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Session expired. Please log in again.' })
    })
  })

  describe('anonymous', () => {
    it('finds or creates an anonymous user by deviceId, issues a session, returns 201', async () => {
      const fakeUser = { _id: 'anon-123' }
      jest.mocked(authService.findOrCreateAnonymousUser).mockResolvedValue(fakeUser as any)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('anon-access')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('anon-refresh')

      const req = { body: { deviceId: 'uuid-1' }, cookies: {} } as unknown as Request
      const res = makeRes()

      await anonymous(req, res as unknown as Response)

      expect(authService.findOrCreateAnonymousUser).toHaveBeenCalledWith('uuid-1')
      expect(tokenService.generateAccessToken).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'anon-123', isAnonymous: true })
      )
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('returns 400 when deviceId is missing', async () => {
      const req = { body: {}, cookies: {} } as unknown as Request
      const res = makeRes()

      await anonymous(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
    })

    it('returns 500 when findOrCreateAnonymousUser throws', async () => {
      jest.mocked(authService.findOrCreateAnonymousUser).mockRejectedValue(new Error('DB error'))

      const req = { body: { deviceId: 'uuid-1' }, cookies: {} } as unknown as Request
      const res = makeRes()

      await anonymous(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
    })
  })

  describe('me', () => {
    it('returns current user email with isAnonymous false for real users', async () => {
      const req = {
        user: { userId: 'user-123', email: 'test@example.com' },
      } as unknown as Request
      const res = makeRes()

      await me(req, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({
        user: { email: 'test@example.com', isAnonymous: false },
      })
    })

    it('returns isAnonymous true for anonymous users', async () => {
      const req = {
        user: { userId: 'anon-123', email: '', isAnonymous: true },
      } as unknown as Request
      const res = makeRes()

      await me(req, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ user: { email: '', isAnonymous: true } })
    })
  })

  describe('logout', () => {
    it('deletes refresh token and clears cookies', async () => {
      jest.mocked(tokenService.deleteRefreshToken).mockResolvedValue(undefined)

      const req = {
        cookies: { refreshToken: 'refresh123' },
        user: { userId: 'user-123' },
      } as unknown as Request
      const res = makeRes()

      await logout(req, res as unknown as Response)

      expect(tokenService.deleteRefreshToken).toHaveBeenCalledWith('refresh123', 'user-123')
      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('clears cookies even if delete token fails', async () => {
      jest.mocked(tokenService.deleteRefreshToken).mockRejectedValue(new Error('DB error'))

      const req = {
        cookies: { refreshToken: 'refresh123' },
        user: { userId: 'user-123' },
      } as unknown as Request
      const res = makeRes()

      await logout(req, res as unknown as Response)

      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res)
      expect(res.json).toHaveBeenCalledWith({ ok: true })
    })

    it('works when refresh token is missing', async () => {
      const req = {
        cookies: {},
        user: { userId: 'user-123' },
      } as unknown as Request
      const res = makeRes()

      await logout(req, res as unknown as Response)

      expect(tokenService.deleteRefreshToken).not.toHaveBeenCalled()
      expect(tokenService.clearAuthCookies).toHaveBeenCalledWith(res)
    })
  })

  describe('migrate', () => {
    it('migrates anonymous user meals to real account', async () => {
      const migratedMeals = [{ _id: 'meal-1' }, { _id: 'meal-2' }]
      jest.mocked(migrateService.migrateDeviceData).mockResolvedValue(migratedMeals as never)

      const req = {
        body: { anonymousUserId: 'anon-old-123' },
        user: { userId: 'user-new-123' },
      } as unknown as Request
      const res = makeRes()

      await migrate(req, res as unknown as Response)

      expect(migrateService.migrateDeviceData).toHaveBeenCalledWith('anon-old-123', 'user-new-123')
      expect(res.json).toHaveBeenCalledWith({ migratedMeals })
    })

    it('returns 400 when anonymousUserId is missing', async () => {
      const req = {
        body: {},
        user: { userId: 'user-123' },
      } as unknown as Request
      const res = makeRes()

      await migrate(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(400)
      expect(res.json).toHaveBeenCalledWith({ error: 'anonymousUserId is required' })
      expect(migrateService.migrateDeviceData).not.toHaveBeenCalled()
    })
  })

  describe('googleCallback', () => {
    it('creates user and redirects on success', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.findOrCreateGoogleUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')

      const req = {
        user: {
          id: 'google-123',
          email: 'test@example.com',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
      } as unknown as Request
      const res = makeRes()

      await googleCallback(req, res as unknown as Response)

      expect(authService.findOrCreateGoogleUser).toHaveBeenCalledWith({
        id: 'google-123',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(tokenService.setAuthCookies).toHaveBeenCalled()
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/?oauth=1')
    })

    it('migrates anonymous meals when an anonymous cookie is present', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(authService.findOrCreateGoogleUser).mockResolvedValue(mockUser as never)
      jest.mocked(tokenService.generateAccessToken).mockReturnValue('access123')
      jest.mocked(tokenService.createRefreshToken).mockResolvedValue('refresh123')
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue({
        userId: 'anon-123',
        email: '',
        isAnonymous: true,
      })
      jest.mocked(migrateService.migrateDeviceData).mockResolvedValue(0 as never)

      const req = {
        user: { id: 'google-123', email: 'test@example.com', avatarUrl: null },
        cookies: { accessToken: 'anon-token' },
      } as unknown as Request
      const res = makeRes()

      await googleCallback(req, res as unknown as Response)

      expect(migrateService.migrateDeviceData).toHaveBeenCalledWith('anon-123', 'user-123')
      expect(res.redirect).toHaveBeenCalledWith('http://localhost:3000/?oauth=1')
    })

    it('redirects to login error on failure', async () => {
      jest.mocked(authService.findOrCreateGoogleUser).mockRejectedValue(new Error('DB error'))

      const req = {
        user: {
          id: 'google-123',
          email: 'test@example.com',
          avatarUrl: null,
        },
      } as unknown as Request
      const res = makeRes()

      await googleCallback(req, res as unknown as Response)

      expect(res.redirect).toHaveBeenCalledWith('/login?error=google_failed')
    })
  })
})
