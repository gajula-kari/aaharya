import bcrypt from 'bcrypt'
import User from '../models/User'
import { registerUser, loginUser, findOrCreateGoogleUser } from './authService'

jest.mock('bcrypt')
jest.mock('../models/User')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('authService', () => {
  describe('registerUser', () => {
    it('creates a new user with hashed password', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com' }
      jest.mocked(User.findOne).mockResolvedValue(null)
      jest.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never)
      jest.mocked(User.create).mockResolvedValue(mockUser as never)

      const result = await registerUser('test@example.com', 'password123')

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12)
      expect(User.create).toHaveBeenCalledWith({
        email: 'test@example.com',
        passwordHash: 'hashedPassword123',
      })
      expect(result).toEqual(mockUser)
    })

    it('throws EMAIL_TAKEN when user already exists', async () => {
      const existingUser = { _id: 'user-456', email: 'test@example.com' }
      jest.mocked(User.findOne).mockResolvedValue(existingUser as never)

      await expect(registerUser('test@example.com', 'password123')).rejects.toThrow('EMAIL_TAKEN')

      expect(User.create).not.toHaveBeenCalled()
    })
  })

  describe('loginUser', () => {
    it('returns user when credentials are valid', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com', passwordHash: 'hash123' }
      jest.mocked(User.findOne).mockResolvedValue(mockUser as never)
      jest.mocked(bcrypt.compare).mockResolvedValue(true as never)

      const result = await loginUser('test@example.com', 'password123')

      expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' })
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hash123')
      expect(result).toEqual(mockUser)
    })

    it('throws EMAIL_NOT_FOUND when user does not exist', async () => {
      jest.mocked(User.findOne).mockResolvedValue(null)

      await expect(loginUser('test@example.com', 'password123')).rejects.toThrow('EMAIL_NOT_FOUND')
    })

    it('throws INVALID_PASSWORD when password does not match', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com', passwordHash: 'hash123' }
      jest.mocked(User.findOne).mockResolvedValue(mockUser as never)
      jest.mocked(bcrypt.compare).mockResolvedValue(false as never)

      await expect(loginUser('test@example.com', 'wrongpassword')).rejects.toThrow(
        'INVALID_PASSWORD'
      )
    })

    it('throws EMAIL_NOT_FOUND when user has no password hash', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com', passwordHash: null }
      jest.mocked(User.findOne).mockResolvedValue(mockUser as never)

      await expect(loginUser('test@example.com', 'password123')).rejects.toThrow('EMAIL_NOT_FOUND')
    })
  })

  describe('findOrCreateGoogleUser', () => {
    it('returns existing user when found by googleId', async () => {
      const mockUser = { _id: 'user-123', email: 'test@example.com', googleId: 'google-123' }
      jest.mocked(User.findOne).mockResolvedValue(mockUser as never)

      const result = await findOrCreateGoogleUser({
        id: 'google-123',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      })

      expect(result).toEqual(mockUser)
    })

    it('updates existing user to link googleId when only email matches', async () => {
      const mockUser = {
        _id: 'user-123',
        email: 'test@example.com',
        googleId: null,
        save: jest.fn().mockResolvedValue({}),
      } as any
      jest.mocked(User.findOne).mockResolvedValue(mockUser as never)

      const result = await findOrCreateGoogleUser({
        id: 'google-123',
        email: 'test@example.com',
        avatarUrl: null,
      })

      expect(mockUser.googleId).toBe('google-123')
      expect(mockUser.save).toHaveBeenCalled()
      expect(result).toEqual(mockUser)
    })

    it('creates new user when not found', async () => {
      const newUser = {
        _id: 'user-456',
        email: 'newuser@example.com',
        googleId: 'google-456',
        avatarUrl: 'https://example.com/avatar.jpg',
      }
      jest.mocked(User.findOne).mockResolvedValue(null)
      jest.mocked(User.create).mockResolvedValue(newUser as never)

      const result = await findOrCreateGoogleUser({
        id: 'google-456',
        email: 'newuser@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
      })

      expect(User.create).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        googleId: 'google-456',
        avatarUrl: 'https://example.com/avatar.jpg',
      })
      expect(result).toEqual(newUser)
    })
  })
})
