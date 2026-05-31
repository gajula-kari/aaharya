import { type Request, type Response } from 'express'
import UserSettings, { type IGoalHistoryEntry } from '../models/UserSettings'

export async function getSettingsController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  console.log('[settings/get] userId:', userId)
  try {
    const settings = await UserSettings.findOne({ userId })
    console.log('[settings/get] found:', !!settings)
    res.json({ settings })
  } catch (err) {
    console.error('[settings/get] error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}

export async function upsertSettingsController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  console.log('[settings/upsert] userId:', userId)
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

    console.log('[settings/upsert] success, userId:', userId)
    res.json({ settings })
  } catch (err) {
    console.error('[settings/upsert] error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}
