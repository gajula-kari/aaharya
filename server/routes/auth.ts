import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import passport from '../config/passport'
import { requireAuth } from '../middleware/auth'
import { register, login, refresh, logout, googleCallback } from '../controllers/authController'

const router = Router()

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

router.post('/register', register)
router.post('/login', loginLimiter, login)
router.post('/refresh', refresh)
router.post('/logout', requireAuth, logout)

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

export default router
