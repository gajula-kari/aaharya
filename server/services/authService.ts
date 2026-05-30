import bcrypt from 'bcrypt'
import User from '../models/User'
import { migrateDeviceData } from './migrateService'

const SALT_ROUNDS = 12

/**
 * Find the existing anonymous User for this device, or create a new one.
 * Called by POST /auth/anonymous.
 */
export async function findOrCreateAnonymousUser(deviceId: string) {
  const existing = await User.findOne({ deviceId, isAnonymous: true })
  if (existing) return existing

  const anon = await User.create({ isAnonymous: true, deviceId })
  // One-time migration: move any legacy meals/settings stored under the raw
  // device ID string (old x-user-id header auth) to the new anonymous User doc.
  await migrateDeviceData(deviceId, String(anon._id)).catch(() => {})
  return anon
}

/**
 * Register a new real account.
 * If anonymousUserId is provided and points to an anonymous User, that doc is
 * upgraded in place (email + passwordHash added, isAnonymous cleared) so that
 * all meals already stored under its _id require no migration.
 */
export async function registerUser(email: string, password: string, anonymousUserId?: string) {
  const existing = await User.findOne({ email })
  if (existing) throw new Error('EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

  if (anonymousUserId) {
    const anon = await User.findOne({ _id: anonymousUserId, isAnonymous: true })
    if (anon) {
      anon.email = email
      anon.passwordHash = passwordHash
      anon.isAnonymous = false
      await anon.save()
      return anon
    }
  }

  return User.create({ email, passwordHash })
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email })
  if (!user || !user.passwordHash) throw new Error('EMAIL_NOT_FOUND')

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) throw new Error('INVALID_PASSWORD')

  return user
}

export async function findOrCreateGoogleUser(profile: {
  id: string
  email: string
  avatarUrl: string | null
}) {
  const existing = await User.findOne({ $or: [{ googleId: profile.id }, { email: profile.email }] })

  if (existing) {
    if (!existing.googleId) {
      existing.googleId = profile.id
      await existing.save()
    }
    return existing
  }

  return User.create({
    email: profile.email,
    googleId: profile.id,
    avatarUrl: profile.avatarUrl,
  })
}
