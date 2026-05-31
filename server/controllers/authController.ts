import type { Request, Response } from 'express'
import {
  registerUser,
  loginUser,
  findOrCreateAnonymousUser,
  findOrCreateGoogleUser,
} from '../services/authService'
import { migrateDeviceData } from '../services/migrateService'
import {
  generateAccessToken,
  verifyAccessToken,
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

async function issueSession(
  res: Response,
  userId: string,
  email: string,
  isAnonymous = false
): Promise<void> {
  const accessToken = generateAccessToken({ userId, email, isAnonymous })
  const refreshToken = await createRefreshToken(userId)
  setAuthCookies(res, accessToken, refreshToken)
}

/** Read the anonymous userId from the existing access token cookie, if any. */
function getAnonymousUserIdFromCookie(req: Request): string | null {
  const token = req.cookies?.accessToken as string | undefined
  if (!token) return null
  const payload = verifyAccessToken(token)
  return payload?.isAnonymous ? payload.userId : null
}

export async function anonymous(req: Request, res: Response): Promise<void> {
  const { deviceId } = req.body as { deviceId?: string }
  console.log('[auth/anonymous] request received')
  if (!deviceId || typeof deviceId !== 'string') {
    res.status(400).json({ error: 'deviceId is required' })
    return
  }
  try {
    const user = await findOrCreateAnonymousUser(deviceId)
    console.log('[auth/anonymous] user:', String(user._id), 'isAnonymous:', user.isAnonymous)
    await issueSession(res, String(user._id), '', true)
    res.status(201).json({ ok: true })
  } catch (err) {
    console.error('[auth/anonymous] error:', err)
    res.status(500).json({ error: 'Failed to create anonymous session' })
  }
}

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as {
    email?: string
    password?: string
  }
  console.log('[auth/register] hasEmail:', !!email, 'hasPassword:', !!password)
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  // If an anonymous session exists, upgrade that doc in place (no migration needed).
  const anonymousUserId = getAnonymousUserIdFromCookie(req)
  console.log('[auth/register] anonymousUserId from cookie:', anonymousUserId)

  try {
    const user = await registerUser(email, password, anonymousUserId ?? undefined)
    console.log('[auth/register] success, userId:', String(user._id))
    await issueSession(res, String(user._id), user.email ?? '')
    res.status(201).json({ user: { email: user.email } })
  } catch (err) {
    console.error('[auth/register] error:', err instanceof Error ? err.message : err)
    res.status(400).json({ error: friendlyError(err) })
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: string; password?: string }
  console.log('[auth/login] attempt')
  if (!email || !password) {
    res.status(400).json({ error: 'email and password are required' })
    return
  }

  // Capture anonymous userId before it's overwritten by the new session.
  const anonymousUserId = getAnonymousUserIdFromCookie(req)
  console.log('[auth/login] anonymousUserId from cookie:', anonymousUserId)

  try {
    const user = await loginUser(email, password)
    await issueSession(res, String(user._id), user.email ?? '')

    // Migrate any anonymous meals into the real account.
    if (anonymousUserId) {
      console.log('[auth/login] migrating anonymous data', anonymousUserId, '→', String(user._id))
      await migrateDeviceData(anonymousUserId, String(user._id))
        .then((n) => console.log('[auth/login] migrated', n, 'meals'))
        .catch((err: unknown) =>
          console.error('[auth/login] migration error:', err instanceof Error ? err.message : err)
        )
    }

    console.log('[auth/login] success, userId:', String(user._id))
    res.json({ user: { email: user.email } })
  } catch (err) {
    console.error('[auth/login] error:', err instanceof Error ? err.message : err)
    res.status(401).json({ error: friendlyError(err) })
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const oldToken = req.cookies?.refreshToken as string | undefined
  console.log(
    '[auth/refresh] hasRefreshToken:',
    !!oldToken,
    'hasAccessToken:',
    !!req.cookies?.accessToken
  )
  if (!oldToken) {
    res.status(401).json({ error: 'No refresh token' })
    return
  }

  // Peek at the access token (expired is fine — we just need the userId)
  const accessToken = req.cookies?.accessToken as string | undefined
  const payload = accessToken
    ? (JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64').toString()) as {
        userId: string
        email: string
        isAnonymous?: boolean
      })
    : null

  if (!payload) {
    console.warn('[auth/refresh] rejected: refreshToken present but no accessToken to read userId')
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const newRefreshToken = await rotateRefreshToken(oldToken, payload.userId)
  if (!newRefreshToken) {
    console.warn('[auth/refresh] token rotation failed for userId:', payload.userId)
    clearAuthCookies(res)
    res.status(401).json({ error: 'Session expired. Please log in again.' })
    return
  }

  console.log(
    '[auth/refresh] rotated for userId:',
    payload.userId,
    'isAnonymous:',
    payload.isAnonymous
  )
  const newAccessToken = generateAccessToken({
    userId: payload.userId,
    email: payload.email,
    isAnonymous: payload.isAnonymous,
  })
  setAuthCookies(res, newAccessToken, newRefreshToken)
  res.json({ ok: true })
}

export async function me(req: Request, res: Response): Promise<void> {
  console.log('[auth/me] userId:', req.user!.userId, 'isAnonymous:', req.user!.isAnonymous)
  res.json({ user: { email: req.user!.email, isAnonymous: req.user!.isAnonymous ?? false } })
}

export async function logout(req: Request, res: Response): Promise<void> {
  console.log('[auth/logout] userId:', req.user?.userId)
  const refreshToken = req.cookies?.refreshToken as string | undefined
  if (refreshToken && req.user?.userId) {
    await deleteRefreshToken(refreshToken, req.user.userId).catch((err: unknown) => {
      console.error(
        '[auth/logout] failed to delete refresh token:',
        err instanceof Error ? err.message : err
      )
    })
  }
  clearAuthCookies(res)
  res.json({ ok: true })
}

export async function migrate(req: Request, res: Response): Promise<void> {
  const { anonymousUserId } = req.body as { anonymousUserId?: string }
  console.log('[auth/migrate] userId:', req.user!.userId, 'hasAnonymousId:', !!anonymousUserId)
  if (!anonymousUserId) {
    res.status(400).json({ error: 'anonymousUserId is required' })
    return
  }
  try {
    const migratedMeals = await migrateDeviceData(anonymousUserId, req.user!.userId)
    console.log('[auth/migrate] success, migratedMeals:', migratedMeals)
    res.json({ migratedMeals })
  } catch (err) {
    console.error('[auth/migrate] error:', (err as Error).message)
    res.status(500).json({ error: 'Migration failed' })
  }
}

export async function googleCallback(req: Request, res: Response): Promise<void> {
  const profile = req.user as unknown as {
    id: string
    email: string
    avatarUrl: string | null
  }

  // Capture anonymous userId before the new session overwrites the cookie.
  const anonymousUserId = getAnonymousUserIdFromCookie(req)
  console.log('[auth/google] callback, hasAnonymousSession:', !!anonymousUserId)

  try {
    const user = await findOrCreateGoogleUser(profile)
    console.log('[auth/google] success, userId:', String(user._id))
    await issueSession(res, String(user._id), user.email ?? '')

    // Migrate any anonymous meals into the Google account.
    if (anonymousUserId) {
      console.log('[auth/google] migrating anonymous data', anonymousUserId, '→', String(user._id))
      await migrateDeviceData(anonymousUserId, String(user._id))
        .then((n) => console.log('[auth/google] migrated', n, 'meals'))
        .catch((err: unknown) =>
          console.error('[auth/google] migration error:', err instanceof Error ? err.message : err)
        )
    }

    res.redirect(`${(process.env.CLIENT_URL ?? '').replace(/\/$/, '')}/?oauth=1`)
  } catch (err) {
    console.error('[auth/google] error:', (err as Error).message)
    res.redirect('/login?error=google_failed')
  }
}
