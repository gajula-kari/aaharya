import { Schema, model } from 'mongoose'

export interface IGoalHistoryEntry {
  goal: number
  month: string // "YYYY-MM"
}

export interface IUserSettings {
  userId: string
  currentMonthlyLimit: number | null
  goalHistory: IGoalHistoryEntry[]
  reminderEnabled: boolean
  reminderTime: string | null
}

const goalHistoryEntrySchema = new Schema<IGoalHistoryEntry>(
  {
    goal: { type: Number, required: true },
    month: { type: String, required: true },
  },
  { _id: false }
)

const userSettingsSchema = new Schema<IUserSettings>(
  {
    userId: { type: String, required: true, unique: true },
    currentMonthlyLimit: { type: Number, default: null },
    goalHistory: { type: [goalHistoryEntrySchema], default: [] },
    reminderEnabled: { type: Boolean, default: false },
    reminderTime: { type: String, default: null },
  },
  { timestamps: true }
)

export default model<IUserSettings>('UserSettings', userSettingsSchema)
