import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext } from './SettingsContext'
import * as api from '../services/settingsApi'
import { CACHE_KEYS } from '../constants/cacheKeys'
import type { Settings } from '../types'

function readSettingsCache(): Settings | null {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.SETTINGS)
    return raw ? (JSON.parse(raw) as Settings) : null
  } catch {
    return null
  }
}

function writeSettingsCache(settings: Settings | null): void {
  try {
    if (settings) localStorage.setItem(CACHE_KEYS.SETTINGS, JSON.stringify(settings))
    else localStorage.removeItem(CACHE_KEYS.SETTINGS)
  } catch {
    // localStorage unavailable — silently skip
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const cached = readSettingsCache()
  const [settings, setSettings] = useState<Settings | null>(cached)
  const [settingsLoading, setSettingsLoading] = useState(!cached)
  const [settingsError, setSettingsError] = useState<string | null>(null)

  useEffect(() => {
    api
      .fetchSettings()
      .then((data) => {
        setSettings(data)
        writeSettingsCache(data)
        setSettingsError(null)
      })
      .catch((err: unknown) => {
        console.error('[settings] fetch failed:', err instanceof Error ? err.message : err)
        setSettingsError('Could not load settings')
      })
      .finally(() => setSettingsLoading(false))
  }, [])

  const saveSettings = useCallback(async (limit: number) => {
    const updated = await api.saveSettings(limit)
    setSettings(updated)
    writeSettingsCache(updated)
    return updated
  }, [])

  const value = useMemo(
    () => ({ settings, settingsLoading, settingsError, saveSettings }),
    [settings, settingsLoading, settingsError, saveSettings]
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}
