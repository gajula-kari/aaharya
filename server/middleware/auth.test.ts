import { type Request, type Response } from 'express'
import { requireAuth } from './auth'
import * as tokenService from '../services/tokenService'

jest.mock('../services/tokenService')

type MockRes = { status: jest.Mock; json: jest.Mock }

function makeRes(): MockRes {
  const res: MockRes = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('auth middleware', () => {
  describe('requireAuth', () => {
    it('allows request with valid JWT token in cookies', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(payload)

      const req = {
        cookies: { accessToken: 'valid-jwt-token' },
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('valid-jwt-token')
      expect((req as any).user).toEqual(payload)
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('allows request with valid x-user-id header when no JWT token', () => {
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(null)

      const req = {
        cookies: { accessToken: 'invalid-jwt-token' },
        headers: { 'x-user-id': 'device-123' },
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect((req as any).user).toEqual({ userId: 'device-123', email: '' })
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('returns 401 when no JWT token and no x-user-id header', () => {
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(null)

      const req = {
        cookies: {},
        headers: {},
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('returns 401 when x-user-id header is not a string', () => {
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(null)

      const req = {
        cookies: {},
        headers: { 'x-user-id': ['device-123'] }, // Array instead of string
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('prioritizes JWT token over x-user-id header', () => {
      const payload = { userId: 'user-456', email: 'jwt@example.com' }
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(payload)

      const req = {
        cookies: { accessToken: 'valid-jwt-token' },
        headers: { 'x-user-id': 'device-123' },
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect((req as any).user).toEqual(payload)
      expect(next).toHaveBeenCalled()
    })
  })
})
