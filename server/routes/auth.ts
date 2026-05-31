import { Router, type Request, type Response, type NextFunction } from 'express'
import rateLimit from 'express-rate-limit'
import passport, { googleAuthEnabled } from '../config/passport'
import { requireAuth } from '../middleware/auth'
import {
  register,
  login,
  anonymous,
  refresh,
  logout,
  me,
  migrate,
  googleCallback,
} from '../controllers/authController'

const router = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })
const anonymousLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 })

router.post('/register', register)
router.post('/login', loginLimiter, login)
router.post('/anonymous', anonymousLimiter, anonymous)
router.post('/refresh', refresh)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)
router.post('/migrate', requireAuth, migrate)

if (googleAuthEnabled) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['email', 'profile'], session: false })
  )
  router.get(
    '/google/callback',
    (req: Request, res: Response, next: NextFunction) => {
      passport.authenticate(
        'google',
        { session: false },
        (err: Error | null, user: Express.User | false | null) => {
          if (err) {
            console.error('[auth/google] passport error:', err.message)
            return res.redirect('/login?error=google_failed')
          }
          if (!user) {
            console.warn('[auth/google] passport: no user returned (OAuth denied or failed)')
            return res.redirect('/login?error=google_failed')
          }
          req.user = user
          next()
        }
      )(req, res, next)
    },
    googleCallback
  )
} else {
  const unavailable = (_req: Request, res: Response) =>
    res.status(501).json({ error: 'Google auth is not configured' })
  router.get('/google', unavailable)
  router.get('/google/callback', unavailable)
}

export default router
