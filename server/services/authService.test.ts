import bcrypt from 'bcrypt'
import User from '../models/User'
import {
  registerUser,
  loginUser,
  findOrCreateAnonymousUser,
  findOrCreateGoogleUser,
} from './authService'

jest.mock('bcrypt')
jest.mock('../models/User')
jest.mock('./migrateService')
import * as migrateService from './migrateService'

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

    it('upgrades anonymous doc when anonymousUserId is provided', async () => {
      const anonUser = {
        _id: 'anon-123',
        email: null,
        isAnonymous: true,
        save: jest.fn().mockResolvedValue(undefined),
      }
      jest
        .mocked(User.findOne)
        .mockResolvedValueOnce(null) // email not taken
        .mockResolvedValueOnce(anonUser as never) // find anonymous user
      jest.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123' as never)

      const result = await registerUser('test@example.com', 'password123', 'anon-123')

      expect(anonUser.save).toHaveBeenCalled()
      expect(anonUser.email).toBe('test@example.com')
      expect(anonUser.isAnonymous).toBe(false)
      expect(User.create).not.toHaveBeenCalled()
      expect(result).toEqual(anonUser)
    })

    it('throws EMAIL_TAKEN when user already exists', async () => {
      const existingUser = { _id: 'user-456', email: 'test@example.com' }
      jest.mocked(User.findOne).mockResolvedValue(existingUser as never)

      await expect(registerUser('test@example.com', 'password123')).rejects.toThrow('EMAIL_TAKEN')

      expect(User.create).not.toHaveBeenCalled()
    })
  })

  describe('findOrCreateAnonymousUser', () => {
    it('returns existing anonymous user when one exists for the deviceId', async () => {
      const existing = { _id: 'anon-1', isAnonymous: true, deviceId: 'uuid-1' }
      jest.mocked(User.findOne).mockResolvedValue(existing as never)

      const result = await findOrCreateAnonymousUser('uuid-1')

      expect(User.findOne).toHaveBeenCalledWith({ deviceId: 'uuid-1', isAnonymous: true })
      expect(User.create).not.toHaveBeenCalled()
      expect(result).toEqual(existing)
    })

    it('creates a new anonymous user and migrates legacy device data', async () => {
      const created = { _id: 'anon-2', isAnonymous: true, deviceId: 'uuid-2' }
      jest.mocked(User.findOne).mockResolvedValue(null)
      jest.mocked(User.create).mockResolvedValue(created as never)
      jest.mocked(migrateService.migrateDeviceData).mockResolvedValue(0)

      const result = await findOrCreateAnonymousUser('uuid-2')

      expect(User.create).toHaveBeenCalledWith({ isAnonymous: true, deviceId: 'uuid-2' })
      // Legacy migration: old meals stored under the device ID move to the new anon _id
      expect(migrateService.migrateDeviceData).toHaveBeenCalledWith('uuid-2', 'anon-2')
      expect(result).toEqual(created)
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
