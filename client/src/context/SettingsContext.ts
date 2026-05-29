import { createContext } from 'react'
import type { Settings } from '../types'

export interface SettingsContextValue {
  settings: Settings | null
  settingsLoading: boolean
  settingsError: string | null
  saveSettings: (limit: number) => Promise<Settings>
}

export const SettingsContext = createContext<SettingsContextValue | null>(null)
