import express, { type Request, type Response } from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import passport from './config/passport'
import mealsRouter from './routes/meals'
import settingsRouter from './routes/settings'
import eventsRouter from './routes/events'
import authRouter from './routes/auth'

const app = express()

app.set('trust proxy', 1)

app.use(
  cors({
    credentials: true,
    origin(requestOrigin, callback) {
      if (process.env.NODE_ENV !== 'production') return callback(null, true)
      const allowed = (process.env.CLIENT_URL ?? '').split(',').map((u) => u.trim())
      callback(null, allowed.includes(requestOrigin ?? '') ? requestOrigin : false)
    },
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(passport.initialize())

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use('/auth', authRouter)
app.use('/meals', mealsRouter)
app.use('/settings', settingsRouter)
app.use('/events', eventsRouter)

export default app
