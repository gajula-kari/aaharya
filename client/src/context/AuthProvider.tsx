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
    await saveSettings(parseInt(pendingLimit, 10)).catch(() => {})
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
      .then(async (u) => {
        if (u) {
          localStorage.setItem(HAS_SESSION_KEY, 'true')
          if (oauthRedirect) {
            await syncPendingData()
          }
        } else {
          localStorage.removeItem(HAS_SESSION_KEY)
          // hasSession was set but refresh returned null → the session expired
          if (hasSession && !oauthRedirect) setSessionExpired(true)
        }
        setUser(u)
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
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    // Server automatically upgrades anonymous doc during register (peeks at cookie).
    const u = await authApi.register(email, password)
    await syncPendingData()
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    localStorage.removeItem(HAS_SESSION_KEY)
    localStorage.removeItem(CACHE_KEYS.EARLIEST_MONTH)
    localStorage.removeItem(CACHE_KEYS.SETTINGS)
    localStorage.removeItem(CACHE_KEYS.SIGNUP_NUDGE_SHOWN)
    setUser(null)
  }, [])

  const skip = useCallback(async () => {
    const pendingLimit = localStorage.getItem(PENDING_LIMIT_KEY)
    await authApi.anonymous(getDeviceId())
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    if (pendingLimit) {
      await saveSettings(parseInt(pendingLimit, 10)).catch(() => {})
      localStorage.removeItem(PENDING_LIMIT_KEY)
    }
    // Fetch updated user from me endpoint to get isAnonymous flag.
    // If refreshSession returns null (unexpected — the cookie was just set),
    // clear the session key so the app doesn't loop on the next open.
    const u = await authApi.refreshSession()
    if (!u) {
      localStorage.removeItem(HAS_SESSION_KEY)
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
