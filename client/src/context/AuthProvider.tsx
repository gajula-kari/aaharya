import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import * as authApi from '../services/authApi'
import { saveSettings } from '../services/settingsApi'
import { getDeviceId } from '../utils/deviceId'
import { CACHE_KEYS } from '../constants/cacheKeys'
import type { AuthUser } from '../services/authApi'

const PENDING_LIMIT_KEY = 'aaharya_pending_limit'
const HAS_SESSION_KEY = 'aaharya_has_session'

async function syncPendingData(): Promise<void> {
  const pendingLimit = localStorage.getItem(PENDING_LIMIT_KEY)
  if (pendingLimit) {
    await saveSettings(parseInt(pendingLimit, 10)).catch((err: unknown) => {
      console.error(
        '[auth] syncPendingData: failed to save pending limit:',
        err instanceof Error ? err.message : err
      )
    })
    localStorage.removeItem(PENDING_LIMIT_KEY)
  }
  // Migration from anonymous → real account is handled server-side during
  // login (the server peeks at the existing anonymous cookie and migrates automatically).
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [sessionExpired, setSessionExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(() => {
    const hasSession = !!localStorage.getItem(HAS_SESSION_KEY)
    const oauthRedirect = new URLSearchParams(window.location.search).get('oauth') === '1'
    return hasSession || oauthRedirect
  })

  useEffect(() => {
    const hasSession = !!localStorage.getItem(HAS_SESSION_KEY)
    const oauthRedirect = new URLSearchParams(window.location.search).get('oauth') === '1'

    if (!hasSession && !oauthRedirect) return

    if (oauthRedirect) {
      const url = new URL(window.location.href)
      url.searchParams.delete('oauth')
      window.history.replaceState({}, '', url.pathname + url.search)
    }

    authApi
      .refreshSession()
      .catch((err: unknown) => {
        console.error(
          '[auth] refreshSession threw unexpectedly:',
          err instanceof Error ? err.message : err
        )
        return null
      })
      .then(async (refreshedUser) => {
        if (refreshedUser) {
          localStorage.setItem(HAS_SESSION_KEY, 'true')
          if (!refreshedUser.isAnonymous) {
            localStorage.setItem(CACHE_KEYS.SESSION_TYPE, 'real')
            localStorage.setItem(CACHE_KEYS.HAS_ACCOUNT, 'true')
          }
          if (oauthRedirect) await syncPendingData()
          setUser(refreshedUser)
          return
        }

        // Refresh failed — session expired
        localStorage.removeItem(HAS_SESSION_KEY)
        const sessionType = localStorage.getItem(CACHE_KEYS.SESSION_TYPE)

        if (sessionType === 'anonymous') {
          // Anonymous session expired — auto-restore silently using the same device ID
          try {
            await authApi.anonymous(getDeviceId())
            localStorage.setItem(HAS_SESSION_KEY, 'true')
            const restoredUser = await authApi.refreshSession()
            setUser(restoredUser)
            return
          } catch (err) {
            console.error(
              '[auth] anonymous auto-restore failed:',
              err instanceof Error ? err.message : err
            )
          }
        } else if (hasSession && !oauthRedirect) {
          // Real account session expired — show login with a brief note
          setSessionExpired(true)
        }

        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const isLoggedIn = !!user
  const isAnonymous = user?.isAnonymous ?? false

  useEffect(() => {
    if (!isLoggedIn) return
    const id = setInterval(
      () => {
        authApi.refreshSession().then((u) => {
          if (u) setUser(u)
        })
      },
      14 * 60 * 1000
    )
    return () => clearInterval(id)
  }, [isLoggedIn])

  const login = useCallback(async (email: string, password: string) => {
    // Server automatically migrates anonymous data during login (peeks at cookie).
    const u = await authApi.login(email, password)
    await syncPendingData()
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    localStorage.setItem(CACHE_KEYS.SESSION_TYPE, 'real')
    localStorage.setItem(CACHE_KEYS.HAS_ACCOUNT, 'true')
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    // Server automatically upgrades anonymous doc during register (peeks at cookie).
    const u = await authApi.register(email, password)
    await syncPendingData()
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    localStorage.setItem(CACHE_KEYS.SESSION_TYPE, 'real')
    localStorage.setItem(CACHE_KEYS.HAS_ACCOUNT, 'true')
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    localStorage.removeItem(HAS_SESSION_KEY)
    localStorage.removeItem(CACHE_KEYS.SESSION_TYPE)
    localStorage.removeItem(CACHE_KEYS.EARLIEST_MONTH)
    localStorage.removeItem(CACHE_KEYS.SETTINGS)
    localStorage.removeItem(CACHE_KEYS.SIGNUP_NUDGE_SHOWN)
    // Clear per-month meal caches
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('aaharya_meals_')) localStorage.removeItem(key)
    }
    setUser(null)
  }, [])

  const skip = useCallback(async () => {
    const pendingLimit = localStorage.getItem(PENDING_LIMIT_KEY)
    await authApi.anonymous(getDeviceId())
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    localStorage.setItem(CACHE_KEYS.SESSION_TYPE, 'anonymous')
    if (pendingLimit) {
      await saveSettings(parseInt(pendingLimit, 10)).catch((err: unknown) => {
        console.error(
          '[auth] skip: failed to save pending limit:',
          err instanceof Error ? err.message : err
        )
      })
      localStorage.removeItem(PENDING_LIMIT_KEY)
    }
    // Fetch updated user from me endpoint to get isAnonymous flag.
    // If refreshSession returns null (unexpected — the cookie was just set),
    // clear the session key so the app doesn't loop on the next open.
    const u = await authApi.refreshSession()
    if (!u) {
      localStorage.removeItem(HAS_SESSION_KEY)
      localStorage.removeItem(CACHE_KEYS.SESSION_TYPE)
      throw new Error('Failed to establish anonymous session. Please try again.')
    }
    setUser(u)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      isAnonymous,
      isLoading,
      sessionExpired,
      login,
      register,
      logout,
      skip,
    }),
    [user, isLoggedIn, isAnonymous, isLoading, sessionExpired, login, register, logout, skip]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
