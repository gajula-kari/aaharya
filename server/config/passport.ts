import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

export const googleAuthEnabled = !!(
  process.env.GOOGLE_CLIENT_ID &&
  process.env.GOOGLE_CLIENT_SECRET &&
  process.env.GOOGLE_CALLBACK_URL
)

if (googleAuthEnabled) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        callbackURL: process.env.GOOGLE_CALLBACK_URL!,
      },
      (_accessToken, _refreshToken, profile, done) => {
        const email = profile.emails?.[0]?.value ?? ''
        const avatarUrl = profile.photos?.[0]?.value ?? null
        done(null, {
          id: profile.id,
          email,
          avatarUrl,
        } as unknown as Express.User)
      }
    )
  )
}

export default passport
