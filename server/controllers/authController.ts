import type { Request, Response } from 'express'
import { registerUser, loginUser, findOrCreateGoogleUser } from '../services/authService'
import { migrateDeviceData } from '../services/migrateService'
import {
  generateAccessToken,
  createRefreshToken,
  rotateRefreshToken,
  deleteRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from '../services/tokenService'

const AUTH_ERRORS: Record<string, string> = {
  EMAIL_TAKEN: 'An account with this email already exists',
  EMAIL_NOT_FOUND: 'EMAIL_NOT_FOUND',
  INVALID_PASSWORD: 'Incorrect password',
}

function friendlyError(err: unknown): string {
  const code = err instanceof Error ? err.message : ''
  return AUTH_ERRORS[code] ?? 'Something went wrong. Try again.'
}

async function issueSession(res: Response, userId: string, email: string): Promise<void> {
  const accessToken = generateAccessToken({ userId, email })
  const refreshToken = await createRefreshToken(userId)
  setAuthCookies(res, accessToken, refreshToken)
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string
    password?: string
  }
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  try {
    const user = await registerUser(email, password)
    await issueSession(res, String(user._id), user.email)
    res.status(201).json({ user: { email: user.email } })
  } catch (err) {
    res.status(400).json({ error: friendlyError(err) })
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string }
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  try {
    const user = await loginUser(email, password)
    await issueSession(res, String(user._id), user.email)
    res.json({ user: { email: user.email } })
  } catch (err) {
    res.status(401).json({ error: friendlyError(err) })
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const oldToken = req.cookies?.refreshToken as string | undefined
  if (!oldToken) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }

  // Peek at the access token (expired is fine here — we just need the userId)
  const accessToken = req.cookies?.accessToken as string | undefined
  const payload = accessToken
    ? (JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()) as {
        userId: string
        email: string
      })
    : null

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const newRefreshToken = await rotateRefreshToken(oldToken, payload.userId)
  if (!newRefreshToken) {
    clearAuthCookies(res)
    res.status(401).json({ error: 'Session expired. Please log in again.' })
    return
  }

  const newAccessToken = generateAccessToken({ userId: payload.userId, email: payload.email })
  setAuthCookies(res, newAccessToken, newRefreshToken)
  res.json({ ok: true })
}

export async function me(req: Request, res: Response): Promise<void> {
  res.json({ user: { email: req.user!.email } })
}

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined
  if (refreshToken && req.user?.userId) {
    await deleteRefreshToken(refreshToken, req.user.userId).catch(() => {})
  }
  clearAuthCookies(res)
  res.json({ ok: true })
}

export async function migrate(req: Request, res: Response): Promise<void> {
  const { deviceId } = req.body as { deviceId?: string }
  if (!deviceId) {
    res.status(400).json({ error: 'deviceId is required' })
    return
  }
  const migratedMeals = await migrateDeviceData(deviceId, req.user!.userId)
  res.json({ migratedMeals })
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const profile = req.user as unknown as {
    id: string
    email: string
    avatarUrl: string | null
  }

  try {
    const user = await findOrCreateGoogleUser(profile)
    await issueSession(res, String(user._id), user.email)
    res.redirect(`${(process.env.CLIENT_URL ?? '').replace(/\/$/, '')}/?oauth=1`)
  } catch {
    res.redirect('/login?error=google_failed')
  }
}
