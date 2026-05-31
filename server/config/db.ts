import mongoose from 'mongoose'

async function connectDB(): Promise<void> {
  mongoose.connection.on('disconnected', () => console.warn('[mongodb] disconnected'))
  mongoose.connection.on('error', (err: Error) =>
    console.error('[mongodb] connection error:', err.message)
  )
  mongoose.connection.on('reconnected', () => console.log('[mongodb] reconnected'))

  try {
    await mongoose.connect(process.env.MONGODB_URI as string)
    console.log('MongoDB connected')
  } catch (err) {
    console.error('MongoDB connection failed:', (err as Error).message)
    process.exit(1)
  }
}

export default connectDB
