import { createContext } from 'react'

export interface InstallContextValue {
  canInstall: boolean
  canInstallIos: boolean
  dismissed: boolean
  dismissedAt: number | null
  install: () => Promise<void>
  dismiss: () => void
}

export const InstallContext = createContext<InstallContextValue>({
  canInstall: false,
  canInstallIos: false,
  dismissed: false,
  dismissedAt: null,
  install: async () => {},
  dismiss: () => {},
})
