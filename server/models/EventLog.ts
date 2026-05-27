import { Schema, model } from 'mongoose'

export const INSTALL_EVENTS = [
  'install_clicked',
  'app_installed',
  'standalone_visit',
  'ios_banner_shown',
  'ios_banner_dismissed',
] as const
export type InstallEvent = (typeof INSTALL_EVENTS)[number]

export interface IEventLog {
  userId: string
  event: InstallEvent
  occurredAt: number
}

const eventLogSchema = new Schema<IEventLog>(
  {
    userId: { type: String, required: true },
    event: {
      type: String,
      enum: [
        'install_clicked',
        'app_installed',
        'standalone_visit',
        'ios_banner_shown',
        'ios_banner_dismissed',
      ],
      required: true,
    },
    occurredAt: { type: Number, required: true },
  },
  { timestamps: true }
)

export default model<IEventLog>('EventLog', eventLogSchema)
