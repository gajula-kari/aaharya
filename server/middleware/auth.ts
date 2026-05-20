import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../services/tokenService'

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.accessToken as string | undefined
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const payload = verifyAccessToken(token)
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  req.user = payload
  next()
}
