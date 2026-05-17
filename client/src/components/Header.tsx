import { useNavigate, useLocation } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import { calculateStreak } from '../utils/streak'

const styles = {
  header: 'flex items-center justify-between px-4 pt-2 pb-3 bg-fog shadow-sm',
  left: 'flex flex-col',
  homeButton: 'text-left',
  title: 'font-fraunces text-xl font-extrabold tracking-wide text-moss',
  right: 'flex items-center gap-3',
  streak: 'text-sm font-medium text-moss',
  settingsButton: 'p-3.5 rounded-lg text-text-muted transition hover:text-slate',
}

export default function Header() {
  const navigate = useNavigate()
  const location = useLocation()
  const { meals } = useMealContext()
  const streak = calculateStreak(meals)

  if (location.pathname !== '/') return null

  return (
    <div className={styles.header}>
      <button
        type="button"
        className={styles.homeButton}
        onClick={() => navigate('/', { replace: true })}
      >
        <div className={styles.left}>
          <span className={styles.title}>aaharya</span>
        </div>
      </button>

      <div className={styles.right}>
        {streak >= 3 && <span className={styles.streak}>🌱 {streak}</span>}
        <button
          type="button"
          onClick={() => navigate('/settings', { replace: true })}
          aria-label="Settings"
          className={styles.settingsButton}
        >
          <SettingsIcon />
        </button>
      </div>
    </div>
  )
}

function SettingsIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
