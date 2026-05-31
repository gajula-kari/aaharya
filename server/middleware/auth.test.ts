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
      expect((req as any).user).toEqual(
        expect.objectContaining({ userId: 'user-123', email: 'test@example.com' })
      )
      expect(next).toHaveBeenCalled()
      expect(res.status).not.toHaveBeenCalled()
    })

    it('includes isAnonymous in req.user from JWT payload', () => {
      const payload = { userId: 'anon-123', email: '', isAnonymous: true }
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(payload)

      const req = {
        cookies: { accessToken: 'anon-token' },
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect((req as any).user).toEqual(
        expect.objectContaining({ userId: 'anon-123', isAnonymous: true })
      )
      expect(next).toHaveBeenCalled()
    })

    it('returns 401 when no cookie is present', () => {
      const req = { cookies: {}, user: undefined } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' })
      expect(next).not.toHaveBeenCalled()
    })

    it('returns 401 when JWT is invalid', () => {
      jest.mocked(tokenService.verifyAccessToken).mockReturnValue(null)

      const req = {
        cookies: { accessToken: 'invalid-token' },
        user: undefined,
      } as unknown as Request
      const res = makeRes()
      const next = jest.fn()

      requireAuth(req, res as unknown as Response, next)

      expect(res.status).toHaveBeenCalledWith(401)
      expect(next).not.toHaveBeenCalled()
    })
  })
})
