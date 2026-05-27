import { type Request, type Response } from 'express'
import { logEvent } from '../services/eventsService'
import type { InstallEvent } from '../models/EventLog'

const VALID_EVENTS: InstallEvent[] = [
  'install_clicked',
  'app_installed',
  'standalone_visit',
  'ios_banner_shown',
  'ios_banner_dismissed',
]

export async function logEventController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  const { event } = req.body as { event: unknown }
  if (!event || !VALID_EVENTS.includes(event as InstallEvent)) {
    res.status(400).json({ error: 'invalid event' })
    return
  }
  try {
    await logEvent(userId, event as InstallEvent)
    res.status(201).json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: (err as Error).message })
  }
}
