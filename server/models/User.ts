import { Schema, model } from 'mongoose'

export interface IUser {
  email?: string
  passwordHash: string | null
  googleId: string | null
  avatarUrl: string | null
  isAnonymous: boolean
  deviceId: string | null
}

const userSchema = new Schema<IUser>(
  {
    // Sparse unique — anonymous users have no email field at all (not even null),
    // so the sparse index skips them. default must be omitted for this to work.
    email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    isAnonymous: { type: Boolean, default: false },
    // Stored on anonymous users only — used to recover the session after token expiry
    deviceId: { type: String, default: null },
  },
  { timestamps: true }
)

export default model<IUser>('User', userSchema)
