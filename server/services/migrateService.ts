import Meal from '../models/Meal'
import UserSettings from '../models/UserSettings'

export async function migrateDeviceData(deviceId: string, accountId: string): Promise<number> {
  const [{ modifiedCount }] = await Promise.all([
    Meal.updateMany({ userId: deviceId }, { $set: { userId: accountId } }),
    UserSettings.updateOne({ userId: deviceId }, { $set: { userId: accountId } }),
  ])
  return modifiedCount
}
