import { Schema, model, type Types } from 'mongoose'

export interface IRefreshToken {
  tokenHash: string
  userId: Types.ObjectId
  expiresAt: Date
}

const refreshTokenSchema = new Schema<IRefreshToken>(
  {
    tokenHash: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// MongoDB auto-deletes documents once expiresAt is reached
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default model<IRefreshToken>('RefreshToken', refreshTokenSchema)
