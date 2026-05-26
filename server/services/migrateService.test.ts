import Meal from '../models/Meal'
import UserSettings from '../models/UserSettings'
import { migrateDeviceData } from './migrateService'

jest.mock('../models/Meal')
jest.mock('../models/UserSettings')

beforeEach(() => {
  jest.clearAllMocks()
})

describe('migrateService', () => {
  describe('migrateDeviceData', () => {
    it('calls Meal.updateMany with the correct args', async () => {
      jest.mocked(Meal.updateMany).mockResolvedValue({ modifiedCount: 3 } as never)
      jest.mocked(UserSettings.updateOne).mockResolvedValue({ modifiedCount: 1 } as never)

      await migrateDeviceData('device-123', 'account-456')

      expect(Meal.updateMany).toHaveBeenCalledWith(
        { userId: 'device-123' },
        { $set: { userId: 'account-456' } }
      )
    })

    it('calls UserSettings.updateOne with the correct args', async () => {
      jest.mocked(Meal.updateMany).mockResolvedValue({ modifiedCount: 2 } as never)
      jest.mocked(UserSettings.updateOne).mockResolvedValue({ modifiedCount: 1 } as never)

      await migrateDeviceData('device-123', 'account-456')

      expect(UserSettings.updateOne).toHaveBeenCalledWith(
        { userId: 'device-123' },
        { $set: { userId: 'account-456' } }
      )
    })

    it('returns the modifiedCount from Meal.updateMany', async () => {
      jest.mocked(Meal.updateMany).mockResolvedValue({ modifiedCount: 5 } as never)
      jest.mocked(UserSettings.updateOne).mockResolvedValue({ modifiedCount: 1 } as never)

      const result = await migrateDeviceData('device-123', 'account-456')

      expect(result).toBe(5)
    })

    it('returns 0 modifiedCount when no meals were migrated', async () => {
      jest.mocked(Meal.updateMany).mockResolvedValue({ modifiedCount: 0 } as never)
      jest.mocked(UserSettings.updateOne).mockResolvedValue({ modifiedCount: 0 } as never)

      const result = await migrateDeviceData('device-123', 'account-456')

      expect(result).toBe(0)
    })
  })
})
