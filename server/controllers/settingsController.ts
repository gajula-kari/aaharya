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
    const { currentMonthlyLimit } = req.body as { currentMonthlyLimit: number }
    const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"

    const existing = await UserSettings.findOne({ userId })
    const history: IGoalHistoryEntry[] = existing?.goalHistory
      ? existing.goalHistory.map((e) => ({ goal: e.goal, month: e.month }))
      : []

    const idx = history.findIndex((e) => e.month === currentMonth)
    if (idx >= 0) {
      history[idx] = { goal: currentMonthlyLimit, month: currentMonth }
    } else {
      history.push({ goal: currentMonthlyLimit, month: currentMonth })
    }
    // Always keep goalHistory sorted ascending by month — clients rely on this ordering.
    history.sort((a, b) => a.month.localeCompare(b.month))

    const settings = await UserSettings.findOneAndUpdate(
      { userId },
      {
        $set: { currentMonthlyLimit, goalHistory: history },
        $setOnInsert: { userId },
      },
      { upsert: true, new: true }
    )

    res.json({ settings })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
