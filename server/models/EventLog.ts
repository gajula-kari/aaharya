import { Schema, model } from 'mongoose'

export const INSTALL_EVENTS = ['banner_shown', 'banner_dismissed', 'standalone_visit'] as const
export type InstallEvent = (typeof INSTALL_EVENTS)[number]

export interface IEventLog {
  userId: string
  event: InstallEvent
  occurredAt: number
}

const eventLogSchema = new Schema<IEventLog>(
  {
    userId: { type: String, required: true },
    event: { type: String, enum: INSTALL_EVENTS, required: true },
    occurredAt: { type: Number, required: true },
  },
  { timestamps: true }
)

export default model<IEventLog>('EventLog', eventLogSchema)
