import { useState } from 'react'
import { useAuthContext } from '../hooks/useAuthContext'
import Spinner from '../components/Spinner'

const ROOT = import.meta.env.VITE_API_URL ?? ''

const styles = {
  page: 'flex flex-1 flex-col px-6 py-10 gap-6',
  header: 'flex flex-col items-center gap-2',
  logo: 'font-fraunces text-2xl font-extrabold tracking-wide text-moss',
  subtitle: 'text-sm text-text-muted',
  form: 'flex flex-col gap-3',
  fieldLabel: 'text-[10px] font-semibold uppercase tracking-widest text-text-muted mb-1 block',
  input:
    'w-full rounded-xl border bg-surface px-4 py-3 text-sm text-slate placeholder:text-text-muted transition focus:border-moss focus:outline-none',
  inputDefault: 'border-border',
  inputError: 'border-overlimit',
  fieldError: 'text-xs text-overlimit mt-1',
  googleButton:
    'flex w-full items-center justify-center gap-3 rounded-full border border-border bg-surface py-3.5 text-sm font-medium text-slate transition hover:bg-fog',
  divider: 'flex items-center gap-3',
  dividerLine: 'h-px flex-1 bg-border',
  dividerText: 'text-xs text-text-muted',
  submitButton:
    'w-full rounded-full bg-moss py-3.5 text-sm font-semibold text-surface transition hover:opacity-90 disabled:opacity-40',
  toggle: 'text-center text-sm text-text-muted',
  toggleLink: 'font-semibold text-moss',
  skip: 'text-center text-sm text-text-muted',
  skipBold: 'font-bold text-slate',
  passwordWrapper: 'relative',
  eyeButton: 'absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-slate',
}

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
)

export default function Login() {
  const { login, register, skip } = useAuthContext()
  const [isSignUp, setIsSignUp] = useState(false)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function clearErrors() {
    setEmailError(null)
    setPasswordError(null)
  }

  function switchMode(signUp: boolean) {
    setIsSignUp(signUp)
    clearErrors()
    setConfirm('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    clearErrors()

    if (isSignUp && password !== confirm) {
      setPasswordError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await register(email.trim(), password, email.split('@')[0])
      } else {
        await login(email.trim(), password)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (msg === 'EMAIL_NOT_FOUND') {
        setEmailError('No account found. Try signing up instead.')
      } else if (msg === 'Incorrect password') {
        setPasswordError('Incorrect password')
      } else if (msg === 'An account with this email already exists') {
        setEmailError('An account with this email already exists')
      } else {
        setEmailError(msg || 'Something went wrong. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <img src="/aaharya-icon.svg" alt="Aaharya" className="h-16 w-16 rounded-2xl" />
        <p className={styles.logo}>aaharya</p>
        <p className={styles.subtitle}>
          {isSignUp ? 'create an account to sync your data' : 'sign in to sync your data'}
        </p>
      </div>

      <a href={`${ROOT}/auth/google`} className={styles.googleButton}>
        <GoogleIcon />
        Continue with Google
      </a>

      <div className={styles.divider}>
        <div className={styles.dividerLine} />
        <span className={styles.dividerText}>or</span>
        <div className={styles.dividerLine} />
      </div>

      <form onSubmit={handleSubmit} className={styles.form} noValidate>
        <div>
          <label className={styles.fieldLabel}>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={`${styles.input} ${emailError ? styles.inputError : styles.inputDefault}`}
          />
          {emailError && <p className={styles.fieldError}>{emailError}</p>}
        </div>

        <div>
          <label className={styles.fieldLabel}>Password</label>
          <div className={styles.passwordWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={`${styles.input} ${passwordError ? styles.inputError : styles.inputDefault} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className={styles.eyeButton}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
          {passwordError && <p className={styles.fieldError}>{passwordError}</p>}
        </div>

        {isSignUp && (
          <div>
            <label className={styles.fieldLabel}>Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
              className={`${styles.input} ${styles.inputDefault}`}
            />
          </div>
        )}

        <button type="submit" disabled={loading} className={styles.submitButton}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Spinner size="sm" /> {isSignUp ? 'Creating account' : 'Signing in'}
            </span>
          ) : (
            'Continue'
          )}
        </button>
      </form>

      <p className={styles.toggle}>
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <button type="button" onClick={() => switchMode(false)} className={styles.toggleLink}>
              Sign in
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button type="button" onClick={() => switchMode(true)} className={styles.toggleLink}>
              Sign up
            </button>
          </>
        )}
      </p>

      <p className={styles.skip}>
        Want to try first?{' '}
        <button type="button" onClick={skip} className={styles.skipBold}>
          Skip for now
        </button>
      </p>
    </div>
  )
}
