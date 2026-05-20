import { Router, type Request, type Response } from 'express'
import rateLimit from 'express-rate-limit'
import passport, { googleAuthEnabled } from '../config/passport'
import { requireAuth } from '../middleware/auth'
import { register, login, refresh, logout, me, googleCallback } from '../controllers/authController'

const router = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

router.post('/register', register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refresh)
router.get('/me', requireAuth, me)
router.post('/logout', requireAuth, logout)

if (googleAuthEnabled) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['email', 'profile'], session: false })
  )
  router.get(
    '/google/callback',
    passport.authenticate('google', {
      session: false,
      failureRedirect: '/login?error=google_failed',
    }),
    googleCallback
  )
} else {
  const unavailable = (_req: Request, res: Response) =>
    res.status(501).json({ error: 'Google auth is not configured' })
  router.get('/google', unavailable)
  router.get('/google/callback', unavailable)
}

export default router
