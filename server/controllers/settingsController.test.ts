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
})

describe('settingsController', () => {
  describe('getSettingsController', () => {
    it('returns settings for user', async () => {
      const mockSettings = { userId: 'user-123', monthlyIndulgentLimit: 7 }
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
    it('creates new settings when user has none', async () => {
      const mockSettings = { userId: 'user-123', monthlyIndulgentLimit: 10 }
      jest.mocked(UserSettings.findOne).mockResolvedValue(null)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(mockSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { monthlyIndulgentLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOne).toHaveBeenCalledWith({ userId: 'user-123' })
      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            monthlyIndulgentLimit: 10,
            goalUpdatedAt: expect.any(Number),
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
      expect(res.json).toHaveBeenCalledWith({ settings: mockSettings })
    })

    it('updates settings and sets previousGoal when limit changes', async () => {
      const existingSettings = { userId: 'user-123', monthlyIndulgentLimit: 7 }
      const updatedSettings = {
        userId: 'user-123',
        monthlyIndulgentLimit: 10,
        previousGoal: 7,
      }
      jest.mocked(UserSettings.findOne).mockResolvedValue(existingSettings as never)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(updatedSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { monthlyIndulgentLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            monthlyIndulgentLimit: 10,
            goalUpdatedAt: expect.any(Number),
            previousGoal: 7,
          },
          $setOnInsert: { userId: 'user-123' },
        },
        { upsert: true, new: true }
      )
      expect(res.json).toHaveBeenCalledWith({ settings: updatedSettings })
    })

    it('does not set previousGoal when limit stays the same', async () => {
      const existingSettings = { userId: 'user-123', monthlyIndulgentLimit: 7 }
      const updatedSettings = { userId: 'user-123', monthlyIndulgentLimit: 7 }
      jest.mocked(UserSettings.findOne).mockResolvedValue(existingSettings as never)
      jest.mocked(UserSettings.findOneAndUpdate).mockResolvedValue(updatedSettings as never)

      const req = {
        user: { userId: 'user-123' },
        body: { monthlyIndulgentLimit: 7 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(UserSettings.findOneAndUpdate).toHaveBeenCalledWith(
        { userId: 'user-123' },
        {
          $set: {
            monthlyIndulgentLimit: 7,
            goalUpdatedAt: expect.any(Number),
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
        body: { monthlyIndulgentLimit: 10 },
      } as unknown as Request
      const res = makeRes()

      await upsertSettingsController(req, res as unknown as Response)

      expect(res.status).toHaveBeenCalledWith(500)
      expect(res.json).toHaveBeenCalledWith({ error: 'DB error' })
    })
  })
})
