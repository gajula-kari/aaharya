import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import type { Response } from 'express'
import RefreshToken from '../models/RefreshToken'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!

const ACCESS_TTL_SECONDS = 15 * 60
const REFRESH_TTL_DAYS = 30
const REFRESH_TTL_MS = REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000

export interface AccessTokenPayload {
  userId: string
  email: string
}

// ── JWT ────────────────────────────────────────────────────────────────────

export function generateAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL_SECONDS })
}

export function verifyAccessToken(token: string): AccessTokenPayload | null {
  try {
    return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload
  } catch {
    return null
  }
}

// ── Refresh token ──────────────────────────────────────────────────────────

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

export async function createRefreshToken(userId: string): Promise<string> {
  const token = crypto.randomBytes(40).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS)
  await RefreshToken.create({ tokenHash: hashToken(token), userId, expiresAt })
  return token
}

export async function rotateRefreshToken(oldToken: string, userId: string): Promise<string | null> {
  const deleted = await RefreshToken.findOneAndDelete({ tokenHash: hashToken(oldToken), userId })
  if (!deleted || deleted.expiresAt < new Date()) return null
  return createRefreshToken(userId)
}

export async function deleteRefreshToken(token: string, userId: string): Promise<void> {
  await RefreshToken.deleteOne({ tokenHash: hashToken(token), userId })
}

// ── Cookies ────────────────────────────────────────────────────────────────

const IS_PROD = process.env.NODE_ENV === 'production'

export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  const base = {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: (IS_PROD ? 'none' : 'lax') as 'none' | 'lax',
  }
  res.cookie('accessToken', accessToken, { ...base, maxAge: ACCESS_TTL_SECONDS * 1000 })
  res.cookie('refreshToken', refreshToken, { ...base, maxAge: REFRESH_TTL_MS })
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken')
  res.clearCookie('refreshToken')
}
