import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuthContext'
import { useMealContext } from '../hooks/useMealContext'

const NUDGE_SHOWN_KEY = 'aaharya_signup_nudge_shown'

export default function SignupNudgeBanner({ monthOffset }: { monthOffset: number }) {
  const { isAnonymous } = useAuthContext()
  const { meals } = useMealContext()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(NUDGE_SHOWN_KEY))

  const visible = isAnonymous && monthOffset === 0 && meals.length >= 7 && !dismissed

  if (!visible) return null

  function handleDismiss() {
    localStorage.setItem(NUDGE_SHOWN_KEY, 'true')
    setDismissed(true)
  }

  return (
    <div className="flex items-center justify-between rounded-2xl bg-slate px-4 py-3 shadow-lg">
      <div className="flex flex-col">
        <p className="text-sm font-medium text-surface">Keep your data safe</p>
        <p className="text-xs text-text-disabled">
          {meals.length} meals saved. Sign up to keep them permanently.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="rounded-xl bg-surface px-3 py-1.5 text-xs font-semibold text-slate transition hover:bg-fog"
        >
          Sign up
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close"
          className="p-2 text-text-disabled transition hover:text-surface"
        >
          <CloseIcon />
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
