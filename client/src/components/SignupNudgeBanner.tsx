import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'
import { useMealContext } from '../hooks/useMealContext'
import { useInstallContext } from '../hooks/useInstallContext'
import { CACHE_KEYS } from '../constants/cacheKeys'

export default function SignupNudgeBanner({ monthOffset }: { monthOffset: number }) {
  const { isAnonymous } = useAuthContext()
  const { meals } = useMealContext()
  const {
    canInstall,
    canInstallIos,
    dismissed: installDismissed,
    dismissedAt,
  } = useInstallContext()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(CACHE_KEYS.SIGNUP_NUDGE_SHOWN)
  )
  const [mountTime] = useState(() => Date.now())

  // InstallBanner is active when install is available, 3+ meals, and not dismissed (or reshow due)
  const daysSinceDismiss = dismissedAt ? (mountTime - dismissedAt) / 86400000 : Infinity
  const installBannerActive =
    (canInstall || canInstallIos) &&
    meals.length >= 3 &&
    (!installDismissed || daysSinceDismiss >= 15)

  const visible =
    isAnonymous && monthOffset === 0 && meals.length >= 7 && !dismissed && !installBannerActive

  if (!visible) return null

  function handleDismiss() {
    localStorage.setItem(CACHE_KEYS.SIGNUP_NUDGE_SHOWN, 'true')
    setDismissed(true)
  }

  return (
    <div className="absolute inset-x-3 top-0 z-10 rounded-2xl bg-slate px-4 py-3 shadow-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-surface leading-snug">Keep your data safe</p>
          <p className="text-xs text-text-disabled pr-4 leading-snug">
            {meals.length} meals saved. Sign up to keep them permanently.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="shrink-0 p-1 text-text-disabled transition hover:text-surface"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="flex justify-end mt-2">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-xs font-semibold text-surface underline decoration-text-disabled underline-offset-2 transition hover:text-neem"
        >
          Sign up
        </button>
      </div>
    </div>
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
