import { Schema, model } from 'mongoose'

export interface IUser {
  email: string
  passwordHash: string | null
  googleId: string | null
  avatarUrl: string | null
}

const userSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    googleId: { type: String, default: null },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: true }
)

export default model<IUser>('User', userSchema)
