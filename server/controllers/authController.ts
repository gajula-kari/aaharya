import type { Request, Response } from 'express'
import { registerUser, loginUser, findOrCreateGoogleUser } from '../services/authService'
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
  INVALID_CREDENTIALS: 'Invalid email or password',
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
  const { email, password, displayName } = req.body as {
    email?: string
    password?: string
    displayName?: string
  }
  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'email, password and displayName are required' })
    return
  }

  try {
    const user = await registerUser(email, password, displayName)
    await issueSession(res, String(user._id), user.email)
    res.status(201).json({ user: { email: user.email, displayName: user.displayName } })
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
    res.json({ user: { email: user.email, displayName: user.displayName } })
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

export async function logout(req: Request, res: Response): Promise<void> {
  const refreshToken = req.cookies?.refreshToken as string | undefined
  if (refreshToken && req.user?.userId) {
    await deleteRefreshToken(refreshToken, req.user.userId).catch(() => {})
  }
  clearAuthCookies(res)
  res.json({ ok: true })
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const profile = req.user as unknown as {
    id: string
    email: string
    displayName: string
    avatarUrl: string | null
  }

  try {
    const user = await findOrCreateGoogleUser(profile)
    await issueSession(res, String(user._id), user.email)
    res.redirect(process.env.CLIENT_URL ?? '/')
  } catch {
    res.redirect('/login?error=google_failed')
  }
}
