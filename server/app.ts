import express, { type Request, type Response } from 'express'
import cors from 'cors'
import mealsRouter from './routes/meals'
import settingsRouter from './routes/settings'
import eventsRouter from './routes/events'

const app = express()

app.use(
  cors({
    origin(requestOrigin, callback) {
      if (process.env.NODE_ENV !== 'production') return callback(null, true)
      const allowed = (process.env.CLIENT_URL ?? '').split(',').map((u) => u.trim())
      callback(null, allowed.includes(requestOrigin ?? '') ? requestOrigin : false)
    },
  })
)
app.use(express.json())

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use('/meals', mealsRouter)
app.use('/settings', settingsRouter)
app.use('/events', eventsRouter)

export default app
