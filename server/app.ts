import express, { type Request, type Response, type NextFunction } from 'express'
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
      if (!requestOrigin || allowed.includes(requestOrigin)) {
        callback(null, requestOrigin || true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
  })
)
app.use(cookieParser())
app.use(express.json())
app.use(passport.initialize())

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`[${req.method}] ${req.path} → ${res.statusCode} (${Date.now() - start}ms)`)
  })
  next()
})

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }))

app.use('/auth', authRouter)
app.use('/meals', mealsRouter)
app.use('/settings', settingsRouter)
app.use('/events', eventsRouter)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (res.headersSent) return
  console.error('[unhandled error]', err.message, err.stack)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
