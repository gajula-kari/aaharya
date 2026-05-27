import { type Request, type Response } from 'express'
import UserSettings, { type IGoalHistoryEntry } from '../models/UserSettings'

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
    const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

    const existing = await UserSettings.findOne({ userId })
    const history: IGoalHistoryEntry[] = existing?.goalHistory
      ? existing.goalHistory.map((e) => ({ goal: e.goal, month: e.month }))
      : []

    const idx = history.findIndex((e) => e.month === currentMonth)
    if (idx >= 0) {
      history[idx] = { goal: monthlyIndulgentLimit, month: currentMonth }
    } else {
      history.push({ goal: monthlyIndulgentLimit, month: currentMonth })
    }
    history.sort((a, b) => a.month.localeCompare(b.month))

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      {
        $set: { monthlyIndulgentLimit, goalHistory: history },
        $setOnInsert: { userId },
      },
      { upsert: true, new: true }
    )

    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
