import { type Request, type Response } from 'express'
import { logEvent } from '../services/eventsService'
import { INSTALL_EVENTS, type InstallEvent } from '../models/EventLog'

export async function logEventController(req: Request, res: Response): Promise<void> {
  const { userId } = req.user!
  const { event } = req.body as { event: unknown }
  console.log('[events/log] userId:', userId, 'event:', event)
  if (!event || !(INSTALL_EVENTS as readonly string[]).includes(event as string)) {
    console.warn('[events/log] invalid event:', event)
    res.status(400).json({ error: 'invalid event' })
    return
  }
  try {
    await logEvent(userId, event as InstallEvent)
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[events/log] error:', (err as Error).message)
    res.status(500).json({ error: (err as Error).message })
  }
}
