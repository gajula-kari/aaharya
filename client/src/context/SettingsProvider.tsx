import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { SettingsContext } from './SettingsContext'
import * as api from '../services/settingsApi'
import type { Settings } from '../types'

const SETTINGS_CACHE_KEY = 'aaharya_settings'

function readSettingsCache(): Settings | null {
  try {
    const raw = localStorage.getItem(SETTINGS_CACHE_KEY)
    return raw ? (JSON.parse(raw) as Settings) : null
  } catch {
    return null
  }
}

function writeSettingsCache(settings: Settings | null): void {
  try {
    if (settings) localStorage.setItem(SETTINGS_CACHE_KEY, JSON.stringify(settings))
    else localStorage.removeItem(SETTINGS_CACHE_KEY)
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
      .catch(() => setSettingsError('Could not load settings'))
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
