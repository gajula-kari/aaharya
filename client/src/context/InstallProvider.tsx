import { useState, useEffect, useRef, type ReactNode } from 'react'
import { InstallContext } from './InstallContext'
import { logEvent } from '../services/eventsApi'
import { isIos } from '../utils/platform'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'aaharya_install_dismissed'
const BANNER_ANIMATED_KEY = 'aaharya_install_banner_animated'
const WAS_INSTALLED_KEY = 'aaharya_was_installed'
const STANDALONE_LOGGED_KEY = 'aaharya_standalone_logged'

function resetInstallFlow() {
  localStorage.removeItem(DISMISSED_KEY)
  localStorage.removeItem(BANNER_ANIMATED_KEY)
  localStorage.removeItem(WAS_INSTALLED_KEY)
  localStorage.removeItem(STANDALONE_LOGGED_KEY)
}

export function InstallProvider({ children }: { children: ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() => {
    // Read prompt captured by the inline script in index.html (fires before React loads)
    const w = window as unknown as { __deferredInstallPrompt?: BeforeInstallPromptEvent | null }
    const early = w.__deferredInstallPrompt ?? null
    w.__deferredInstallPrompt = null // clear so it isn't re-read on remount
    return early
  })
  const [dismissedAt, setDismissedAt] = useState<number | null>(() => {
    const val = localStorage.getItem(DISMISSED_KEY)
    if (!val) return null
    const ts = parseInt(val, 10)
    if (isNaN(ts)) {
      // Migrate legacy 'true' value — treat as dismissed just now so re-show waits 15 days
      const now = Date.now()
      localStorage.setItem(DISMISSED_KEY, String(now))
      return now
    }
    return ts
  })
  const dismissed = dismissedAt !== null
  const [isInstalled, setIsInstalled] = useState(
    () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      !!(navigator as { standalone?: boolean }).standalone
  )

  const wasStandaloneOnMount = useRef(isInstalled)
  useEffect(() => {
    if (wasStandaloneOnMount.current && !localStorage.getItem(STANDALONE_LOGGED_KEY)) {
      localStorage.setItem(STANDALONE_LOGGED_KEY, 'true')
      logEvent('standalone_visit')
    }
  }, [])

  useEffect(() => {
    if (isInstalled) return
    const handler = (e: Event) => {
      e.preventDefault()
      if (localStorage.getItem(WAS_INSTALLED_KEY) === 'true') {
        resetInstallFlow()
        setDismissedAt(null)
      }
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    const mq = window.matchMedia('(display-mode: standalone)')
    const mqHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setIsInstalled(true)
    }
    mq.addEventListener('change', mqHandler)
    const installedHandler = () => {
      localStorage.setItem(WAS_INSTALLED_KEY, 'true')
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', installedHandler)
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      mq.removeEventListener('change', mqHandler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [isInstalled])

  async function install() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }

  function dismiss() {
    const now = Date.now()
    localStorage.setItem(DISMISSED_KEY, String(now))
    setDismissedAt(now)
  }

  return (
    <InstallContext.Provider
      value={{
        canInstall: !!deferredPrompt && !isInstalled,
        canInstallIos: isIos() && !isInstalled,
        dismissed,
        dismissedAt,
        install,
        dismiss,
      }}
    >
      {children}
    </InstallContext.Provider>
  )
}
