import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../services/tokenService'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Prefer JWT cookie (logged-in users)
  const token = req.cookies?.accessToken as string | undefined
  if (token) {
    const payload = verifyAccessToken(token)
    if (payload) {
      req.user = { userId: payload.userId, email: payload.email, isAnonymous: payload.isAnonymous }
      return next()
    }
  }

  // Fall back to device ID header (skipped users)
  const deviceId = req.headers['x-user-id']
  if (deviceId && typeof deviceId === 'string') {
    req.user = { userId: deviceId, email: '' }
    return next()
  }

  res.status(401).json({ error: 'Unauthorized' })
}
