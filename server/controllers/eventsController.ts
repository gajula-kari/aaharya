import { type Request, type Response } from 'express'
import { logEvent } from '../services/eventsService'
import { INSTALL_EVENTS, type InstallEvent } from '../models/EventLog'

export async function logEventController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  const { event } = req.body as { event: unknown }
  if (!event || !(INSTALL_EVENTS as readonly string[]).includes(event as string)) {
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
