import { useLocation, useNavigate } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import { calculateStreak } from '../utils/streak'

const styles = {
  // Home header
  homeHeader: 'flex items-center justify-between px-4 pt-2 pb-3 bg-fog shadow-sm',
  homeButton: 'text-left',
  logo: 'font-fraunces text-xl font-extrabold tracking-wide text-moss',
  right: 'flex items-center gap-3',
  streak: 'text-sm font-medium text-moss',
  settingsButton: 'p-3.5 rounded-lg text-text-muted transition hover:text-slate',
  // Page header
  pageHeader: 'flex items-center gap-1 bg-fog px-2 py-4 shadow-sm',
  backButton: 'rounded-full p-2 text-slate transition hover:bg-neem/30',
  pageTitle: 'flex-1 text-base font-semibold text-slate',
  pageTitleStack: 'flex-1',
  pageSubtitle: 'text-xs text-text-muted',
  pastBadge: 'ml-1.5 text-sm font-normal text-text-muted',
}

export default function AppHeader() {
  const location = useLocation()
  const navigate = useNavigate()
  const { meals } = useMealContext()
  const pathname = location.pathname

  // TagMeal has its own full-screen layout
  if (pathname === '/tag') return null

  // Home header
  if (pathname === '/') {
    const streak = calculateStreak(meals)
    return (
      <div className={styles.homeHeader}>
        <button
          type="button"
          className={styles.homeButton}
          onClick={() => navigate('/', { replace: true })}
        >
          <span className={styles.logo}>aaharya</span>
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

  // Settings — always go home (settings replaces home in history so -1 closes the app)
  if (pathname === '/settings') {
    return (
      <div className={styles.pageHeader}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate('/', { replace: true })}
          className={styles.backButton}
        >
          <ChevronLeftIcon />
        </button>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>
    )
  }

  // Meals page — title + meal count subtitle
  if (pathname === '/meals') {
    const now = new Date()
    const monthYear = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    const count = meals.filter((m) => {
      const d = new Date(m.occurredAt)
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    }).length
    return (
      <div className={styles.pageHeader}>
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate(-1)}
          className={styles.backButton}
        >
          <ChevronLeftIcon />
        </button>
        <div className={styles.pageTitleStack}>
          <h1 className={styles.pageTitle}>{monthYear}</h1>
          {count > 0 && (
            <p className={styles.pageSubtitle}>
              {count} {count === 1 ? 'meal' : 'meals'}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Page header — back button + title
  const title = getPageTitle(pathname)

  return (
    <div className={styles.pageHeader}>
      <button
        type="button"
        aria-label="Back"
        onClick={() => navigate(-1)}
        className={styles.backButton}
      >
        <ChevronLeftIcon />
      </button>
      <h1 className={styles.pageTitle}>
        {title.text}
        {title.pastBadge && <span className={styles.pastBadge}>· past</span>}
      </h1>
    </div>
  )
}

function getPageTitle(pathname: string): { text: string; pastBadge: boolean } {
  if (pathname.startsWith('/day/')) {
    const dateStr = pathname.slice(5)
    const [y, m, d] = dateStr.split('-').map(Number)
    const selectedDate = new Date(y, m - 1, d)
    const isToday = selectedDate.toDateString() === new Date().toDateString()
    const text = selectedDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    })
    return { text, pastBadge: !isToday }
  }

  return { text: '', pastBadge: false }
}

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
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
