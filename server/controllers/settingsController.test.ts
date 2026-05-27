import { type Request, type Response } from 'express'
import UserSettings from '../models/UserSettings'
import { getSettingsController, upsertSettingsController } from './settingsController'

jest.mock('../models/UserSettings')

type MockRes = { status: jest.Mock; json: jest.Mock }

function makeRes(): MockRes {
  const res: MockRes = { status: jest.fn(), json: jest.fn() }
  res.status.mockReturnValue(res)
  res.json.mockReturnValue(res)
  return res
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.useFakeTimers()
  jest.setSystemTime(new Date('2026-05-15'))
})

afterEach(() => {
  jest.useRealTimers()
})

describe('settingsController', () => {
  describe('getSettingsController', () => {
    it('returns settings for user', async () => {
      const mockSettings = {
        userId: 'user-123',
        currentMonthlyLimit: 7,
        goalHistory: [{ goal: 7, month: '2026-05' }],
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(mockSettings as never)

      const req = { user: { userId: 'user-123' } } as unknown as Request
      const res = makeRes()

      await getSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOne).toHaveBeenCalledWith({ userId: 'user-123' })
      expect(res.json).toHaveBeenCalledWith({ settings: mockSettings })
    })

    it('returns null settings when user has no settings', async () => {
      jest.mocked(UserSettings.findOne).mockResolvedValue(null)

      const req = { user: { userId: 'user-123' } } as unknown as Request
      const res = makeRes()

      await getSettingsController(req, res as unknown as Response)

      expect(res.json).toHaveBeenCalledWith({ settings: null })
    })

    it('returns 500 on database error', async () => {
      jest.mocked(UserSettings.findOne).mockRejectedValue(new Error('DB connection lost'))

      const req = { user: { userId: 'user-123' } } as unknown as Request
      const res = makeRes()

      await getSettingsController(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'DB connection lost' })
    })
  })

  describe('upsertSettingsController', () => {
    it('creates new settings with goalHistory when user has none', async () => {
      const mockSettings = {
        userId: 'user-123',
        currentMonthlyLimit: 10,
        goalHistory: [{ goal: 10, month: '2026-05' }],
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(null)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(mockSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { currentMonthlyLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            currentMonthlyLimit: 10,
            goalHistory: [{ goal: 10, month: '2026-05' }],
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
      expect(res.json).toHaveBeenCalledWith({ settings: mockSettings })
    })

    it('replaces existing entry when goal changes in the same month', async () => {
      const existingSettings = {
        userId: 'user-123',
        currentMonthlyLimit: 7,
        goalHistory: [{ goal: 7, month: '2026-05' }],
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(existingSettings as never)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(existingSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { currentMonthlyLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            currentMonthlyLimit: 10,
            goalHistory: [{ goal: 10, month: '2026-05' }],
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
    })

    it('appends and sorts when goal is set in a new month', async () => {
      const existingSettings = {
        userId: 'user-123',
        currentMonthlyLimit: 7,
        goalHistory: [{ goal: 7, month: '2026-04' }],
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(existingSettings as never)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(existingSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { currentMonthlyLimit: 5 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            currentMonthlyLimit: 5,
            goalHistory: [
              { goal: 7, month: '2026-04' },
              { goal: 5, month: '2026-05' },
            ],
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
    })

    it('is idempotent when limit is unchanged', async () => {
      const existingSettings = {
        userId: 'user-123',
        currentMonthlyLimit: 7,
        goalHistory: [{ goal: 7, month: '2026-05' }],
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(existingSettings as never)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(existingSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { currentMonthlyLimit: 7 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            currentMonthlyLimit: 7,
            goalHistory: [{ goal: 7, month: '2026-05' }],
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
    })

    it('returns 500 on database error', async () => {
      jest.mocked(UserSettings.findOne).mockRejectedValue(new Error('DB error'))

      const req = {
        user: { userId: 'user-123' },
        body: { currentMonthlyLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' })
    })
  })
})
