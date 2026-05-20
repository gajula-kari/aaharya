import { type Request, type Response } from 'express'
import UserSettings from '../models/UserSettings'

export async function getSettingsController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  try {
    const settings = await UserSettings.findOne({ userId })
    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}

export async function upsertSettingsController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  try {
    const { monthlyIndulgentLimit } = req.body as { monthlyIndulgentLimit: number }
    const existing = await UserSettings.findOne({ userId })

    const update: Record<string, unknown> = { monthlyIndulgentLimit, goalUpdatedAt: Date.now() }

    if (existing && existing.monthlyIndulgentLimit !== monthlyIndulgentLimit) {
      update.previousGoal = existing.monthlyIndulgentLimit
    }

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { upsert: true, new: true }
    )

    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
