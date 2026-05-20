import bcrypt from 'bcrypt'
import User from '../models/User'

const SALT_ROUNDS = 12

export async function registerUser(email: string, password: string, displayName: string) {
  const existing = await User.findOne({ email })
  if (existing) throw new Error('EMAIL_TAKEN')

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)
  return User.create({ email, passwordHash, displayName })
}

export async function loginUser(email: string, password: string) {
  const user = await User.findOne({ email })
  if (!user || !user.passwordHash) throw new Error('INVALID_CREDENTIALS')

  const match = await bcrypt.compare(password, user.passwordHash)
  if (!match) throw new Error('INVALID_CREDENTIALS')

  return user
}

export async function findOrCreateGoogleUser(profile: {
  id: string
  email: string
  displayName: string
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
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  })
}
