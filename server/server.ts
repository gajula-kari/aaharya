import 'dotenv/config'
import connectDB from './config/db'
import app from './app'

const PORT = process.env.PORT || 3000

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message, err.stack)
})

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason)
})

connectDB().then(() => {
  console.log('[startup] NODE_ENV:', process.env.NODE_ENV ?? 'development')
  console.log('[startup] MongoDB URI set:', !!process.env.MONGODB_URI)
  console.log('[startup] JWT_ACCESS_SECRET set:', !!process.env.JWT_ACCESS_SECRET)
  console.log(
    '[startup] Cloudinary configured:',
    !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )
  )
  console.log(
    '[startup] Google OAuth configured:',
    !!(
      process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_CALLBACK_URL
    )
  )
  console.log('[startup] CLIENT_URL:', process.env.CLIENT_URL ?? '(not set)')
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
  })
})
