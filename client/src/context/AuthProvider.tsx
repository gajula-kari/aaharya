import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './AuthContext'
import * as authApi from '../services/authApi'
import { saveSettings } from '../services/settingsApi'
import { getDeviceId } from '../utils/deviceId'
import type { AuthUser } from '../services/authApi'

const SKIPPED_KEY = 'aaharya_skipped'
const PENDING_LIMIT_KEY = 'aaharya_pending_limit'
const HAS_SESSION_KEY = 'aaharya_has_session'

async function syncPendingData(wasSkipped: boolean): Promise<void> {
  const pendingLimit = localStorage.getItem(PENDING_LIMIT_KEY)
  if (pendingLimit) {
    await saveSettings(parseInt(pendingLimit, 10)).catch(() => {})
    localStorage.removeItem(PENDING_LIMIT_KEY)
  }

  if (wasSkipped) {
    await authApi.migrateDevice(getDeviceId()).catch(() => {})
    localStorage.removeItem(SKIPPED_KEY)
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isSkipped, setIsSkipped] = useState(() => !!localStorage.getItem(SKIPPED_KEY))
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
      .then(async (user) => {
        if (user) {
          localStorage.setItem(HAS_SESSION_KEY, 'true')
          if (oauthRedirect) {
            const wasSkipped = !!localStorage.getItem(SKIPPED_KEY)
            await syncPendingData(wasSkipped)
            setIsSkipped(false)
          }
        } else {
          localStorage.removeItem(HAS_SESSION_KEY)
        }
        setUser(user)
      })
      .finally(() => setIsLoading(false))
  }, [])

  const isLoggedIn = !!user

  useEffect(() => {
    if (!isLoggedIn) return
    const id = setInterval(
      () => {
        authApi.refreshSession().then((u) => {
          if (u) setUser(u)
          else localStorage.removeItem(HAS_SESSION_KEY)
        })
      },
      14 * 60 * 1000
    )
    return () => clearInterval(id)
  }, [isLoggedIn])

  const login = useCallback(async (email: string, password: string) => {
    const wasSkipped = !!localStorage.getItem(SKIPPED_KEY)
    const u = await authApi.login(email, password)
    await syncPendingData(wasSkipped)
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    setIsSkipped(false)
    setUser(u)
  }, [])

  const register = useCallback(async (email: string, password: string) => {
    const wasSkipped = !!localStorage.getItem(SKIPPED_KEY)
    const u = await authApi.register(email, password)
    await syncPendingData(wasSkipped)
    localStorage.setItem(HAS_SESSION_KEY, 'true')
    setIsSkipped(false)
    setUser(u)
  }, [])

  const logout = useCallback(async () => {
    await authApi.logout()
    localStorage.removeItem(HAS_SESSION_KEY)
    setUser(null)
  }, [])

  const skip = useCallback(async () => {
    localStorage.setItem(SKIPPED_KEY, 'true')
    const pendingLimit = localStorage.getItem(PENDING_LIMIT_KEY)
    if (pendingLimit) {
      await saveSettings(parseInt(pendingLimit, 10)).catch(() => {})
      localStorage.removeItem(PENDING_LIMIT_KEY)
    }
    setIsSkipped(true)
  }, [])

  const unSkip = useCallback(() => {
    setIsSkipped(false)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isLoggedIn,
      isSkipped,
      isLoading,
      login,
      register,
      logout,
      skip,
      unSkip,
    }),
    [user, isSkipped, isLoading, login, register, logout, skip, unSkip]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
