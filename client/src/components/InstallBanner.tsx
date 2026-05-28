import { useState, useEffect, useRef } from 'react'
import { useInstallContext } from '../hooks/useInstallContext'
import { useMealContext } from '../hooks/useMealContext'
import { logEvent } from '../services/eventsApi'

const BANNER_ANIMATED_KEY = 'aaharya_install_banner_animated'
const RESHOW_AFTER_DAYS = 15

const styles = {
  wrapper:
    'absolute inset-x-3 top-0 z-10 flex items-center justify-between rounded-2xl bg-slate px-4 py-3 shadow-lg',
  textGroup: 'flex flex-col',
  title: 'text-sm font-medium text-surface',
  subtitle: 'text-xs text-text-disabled',
  actions: 'flex items-center gap-3',
  installButton:
    'rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-slate transition hover:bg-fog',
  dismissButton: 'p-2 text-text-disabled transition hover:text-surface',
}

export default function InstallBanner() {
  const { visible, isIos, isOffset, shouldAnimate, install, dismiss } = useInstallBanner()

  if (!visible) return null

  return (
    <div
      className={styles.wrapper}
      style={{
        transform: isOffset ? 'translateY(-150%)' : 'translateY(0)',
        opacity: isOffset ? 0 : 1,
        ...(shouldAnimate && { transition: 'transform 0.5s ease-out, opacity 0.5s ease-out' }),
      }}
    >
      {isIos ? <IosBanner dismiss={dismiss} /> : <Banner install={install} dismiss={dismiss} />}
    </div>
  )
}

function useInstallBanner() {
  const { canInstall, canInstallIos, dismissed, dismissedAt, install, dismiss } =
    useInstallContext()
  const { meals } = useMealContext()
  const [mountTime] = useState(() => Date.now())

  const isIos = canInstallIos
  const daysSinceDismiss = dismissedAt ? (mountTime - dismissedAt) / 86400000 : Infinity
  const reshowDue = dismissed && daysSinceDismiss >= RESHOW_AFTER_DAYS
  const visible = (canInstall || canInstallIos) && meals.length >= 3 && (!dismissed || reshowDue)

  const [shouldAnimate] = useState(() => {
    if (reshowDue) {
      localStorage.removeItem(BANNER_ANIMATED_KEY)
      return true
    }
    return !localStorage.getItem(BANNER_ANIMATED_KEY)
  })
  const [isOffset, setIsOffset] = useState(shouldAnimate)

  useEffect(() => {
    if (!visible || !shouldAnimate) return
    localStorage.setItem(BANNER_ANIMATED_KEY, 'true')
    const timer = setTimeout(() => setIsOffset(false), 2500)
    return () => clearTimeout(timer)
  }, [visible, shouldAnimate])

  // Log ios_banner_shown once per mount when the iOS banner first becomes visible
  const iosShownLogged = useRef(false)
  useEffect(() => {
    if (visible && isIos && !iosShownLogged.current) {
      iosShownLogged.current = true
      logEvent('ios_banner_shown')
    }
  }, [visible, isIos])

  function handleDismiss() {
    if (isIos) logEvent('ios_banner_dismissed')
    dismiss()
  }

  return { visible, isIos, isOffset, shouldAnimate, install, dismiss: handleDismiss }
}

interface BannerProps {
  install: () => void
  dismiss: () => void
}

function Banner({ install, dismiss }: BannerProps) {
  return (
    <>
      <div className={styles.textGroup}>
        <p className={styles.title}>Install App</p>
        <p className={styles.subtitle}>Add Aaharya to your home screen</p>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={install} className={styles.installButton}>
          Install
        </button>
        <button type="button" onClick={dismiss} aria-label="Close" className={styles.dismissButton}>
          <CloseIcon />
        </button>
      </div>
    </>
  )
}

function IosBanner({ dismiss }: { dismiss: () => void }) {
  return (
    <>
      <div className={styles.textGroup}>
        <p className={styles.title}>Install App</p>
        <p className={styles.subtitle}>
          Tap <ShareIcon /> then &ldquo;Add to Home Screen&rdquo;
        </p>
      </div>

      <div className={styles.actions}>
        <button type="button" onClick={dismiss} aria-label="Close" className={styles.dismissButton}>
          <CloseIcon />
        </button>
      </div>
    </>
  )
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="11"
      height="11"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ display: 'inline', verticalAlign: 'middle', marginBottom: '1px' }}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
