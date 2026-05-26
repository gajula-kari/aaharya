import { Response } from 'express'
import RefreshToken from '../models/RefreshToken'
import {
  generateAccessToken,
  verifyAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  deleteRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from './tokenService'

jest.mock('../models/RefreshToken')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('tokenService', () => {
  describe('generateAccessToken', () => {
    it('returns a three-part JWT string', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateAccessToken(payload)
      const parts = token.split('.')
      expect(parts).toHaveLength(3)
    })

    it('encodes the payload in the token', () => {
      const payload = { userId: 'user-abc', email: 'user@example.com' }
      const token = generateAccessToken(payload)
      const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      expect(decoded.userId).toBe('user-abc')
      expect(decoded.email).toBe('user@example.com')
    })
  })

  describe('verifyAccessToken', () => {
    it('returns the payload for a valid token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateAccessToken(payload)
      const result = verifyAccessToken(token)
      expect(result).not.toBeNull()
      expect(result?.userId).toBe('user-123')
      expect(result?.email).toBe('test@example.com')
    })

    it('returns null for an invalid token', () => {
      const result = verifyAccessToken('not.a.validtoken')
      expect(result).toBeNull()
    })

    it('returns null for a tampered token', () => {
      const payload = { userId: 'user-123', email: 'test@example.com' }
      const token = generateAccessToken(payload)
      const tampered = token.slice(0, -5) + 'XXXXX'
      const result = verifyAccessToken(tampered)
      expect(result).toBeNull()
    })
  })

  describe('createRefreshToken', () => {
    it('creates and stores a refresh token', async () => {
      const mockRefreshToken = { tokenHash: 'hashedtoken', userId: 'user-123' }
      jest.mocked(RefreshToken.create).mockResolvedValue(mockRefreshToken as never)

      const result = await createRefreshToken('user-123')

      expect(RefreshToken.create).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        userId: 'user-123',
        expiresAt: expect.any(Date),
      })
      expect(result).toBeDefined()
    })
  })

  describe('rotateRefreshToken', () => {
    it('deletes old token and creates new one when token is valid', async () => {
      const futureDate = new Date(Date.now() + 1000000)
      const mockOldToken = { expiresAt: futureDate }
      jest.mocked(RefreshToken.findOneAndDelete).mockResolvedValue(mockOldToken as never)
      jest.mocked(RefreshToken.create).mockResolvedValue({ tokenHash: 'hashedtoken' } as never)

      const result = await rotateRefreshToken('oldtoken', 'user-123')

      expect(RefreshToken.findOneAndDelete).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        userId: 'user-123',
      })
      expect(RefreshToken.create).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('returns null when old token not found', async () => {
      jest.mocked(RefreshToken.findOneAndDelete).mockResolvedValue(null)

      const result = await rotateRefreshToken('oldtoken', 'user-123')

      expect(result).toBeNull()
      expect(RefreshToken.create).not.toHaveBeenCalled()
    })

    it('returns null when old token is expired', async () => {
      const pastDate = new Date(Date.now() - 1000000)
      const mockOldToken = { expiresAt: pastDate }
      jest.mocked(RefreshToken.findOneAndDelete).mockResolvedValue(mockOldToken as never)

      const result = await rotateRefreshToken('oldtoken', 'user-123')

      expect(result).toBeNull()
      expect(RefreshToken.create).not.toHaveBeenCalled()
    })
  })

  describe('deleteRefreshToken', () => {
    it('deletes a refresh token', async () => {
      jest.mocked(RefreshToken.deleteOne).mockResolvedValue({} as never)

      await deleteRefreshToken('token123', 'user-123')

      expect(RefreshToken.deleteOne).toHaveBeenCalledWith({
        tokenHash: expect.any(String),
        userId: 'user-123',
      })
    })
  })

  describe('setAuthCookies', () => {
    it('sets both access and refresh token cookies', () => {
      const mockRes = {
        cookie: jest.fn(),
      } as unknown as Response

      setAuthCookies(mockRes, 'accesstoken123', 'refreshtoken456')

      expect(mockRes.cookie).toHaveBeenCalledTimes(2)
      expect(mockRes.cookie).toHaveBeenNthCalledWith(1, 'accessToken', 'accesstoken123', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 15 * 60 * 1000,
      })
      expect(mockRes.cookie).toHaveBeenNthCalledWith(2, 'refreshToken', 'refreshtoken456', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      })
    })
  })

  describe('clearAuthCookies', () => {
    it('clears both auth cookies', () => {
      const mockRes = {
        clearCookie: jest.fn(),
      } as unknown as Response

      clearAuthCookies(mockRes)

      expect(mockRes.clearCookie).toHaveBeenCalledTimes(2)
      expect(mockRes.clearCookie).toHaveBeenCalledWith('accessToken')
      expect(mockRes.clearCookie).toHaveBeenCalledWith('refreshToken')
    })
  })
})
