import { useNavigate } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { computeDayStatuses, type DayStatus } from '../utils/computeDayStatuses'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const styles = {
  grid: 'grid grid-cols-7 gap-1',
  dayHeader: 'py-1 text-center text-[9px] font-normal text-text-disabled',
  dayButton:
    'flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition',
  // past states — cell bg carries the color, text contrasts against it
  dayEmpty: 'border border-[0.5px] border-border bg-surface text-text-muted hover:opacity-80',
  dayClean: 'bg-clean text-clean-text hover:opacity-80',
  dayIndulgent: 'bg-indulgent text-surface hover:opacity-80',
  dayOverLimit: 'bg-overlimit text-surface hover:opacity-80',
  // future — nearly invisible, clearly inactive
  dayFuture: 'cursor-not-allowed text-text-disabled opacity-20',
  // today — prominent regardless of meal status
  dayToday: 'ring-2 ring-moss ring-offset-1',
}

function statusToStyleKey(status: DayStatus): string {
  switch (status) {
    case 'clean':
      return styles.dayClean
    case 'indulgent':
      return styles.dayIndulgent
    case 'overlimit':
      return styles.dayOverLimit
    case 'empty':
      return styles.dayEmpty
    case 'future':
      return styles.dayFuture
  }
}

function getStartOffset(): number {
  const today = new Date()
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay()
  return (firstDay + 6) % 7 // Mon = 0, Sun = 6
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

interface CalendarProps {
  canShare?: boolean
  onShare?: () => void
}

export default function Calendar({ canShare = false, onShare }: CalendarProps) {
  const navigate = useNavigate()
  const { meals } = useMealContext()
  const { settings } = useSettingsContext()

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
  const offset = getStartOffset()

  const dayStatuses = computeDayStatuses(
    meals,
    month,
    year,
    settings?.monthlyIndulgentLimit ?? null
  )

  return (
    <div className="relative">
      <div className={styles.grid}>
        {DAY_LABELS.map((label) => (
          <div key={label} className={styles.dayHeader}>
            {label}
          </div>
        ))}

        {Array.from({ length: offset }).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {days.map((day) => {
          const date = new Date(year, month, day)
          const dayInfo = dayStatuses.get(day)!
          const dayStyle = statusToStyleKey(dayInfo.status)

          return (
            <button
              key={day}
              type="button"
              disabled={dayInfo.status === 'future'}
              onClick={() => navigate(`/day/${formatLocalDate(date)}`)}
              className={`${styles.dayButton} ${dayStyle} ${dayInfo.isToday ? styles.dayToday : ''}`}
            >
              {day}
            </button>
          )
        })}
      </div>
      {canShare && onShare && (
        <button
          type="button"
          onClick={onShare}
          aria-label="Share"
          className="absolute bottom-1 right-1 rounded-lg p-3.5 text-text-muted transition hover:text-slate"
        >
          <ShareIcon />
        </button>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  )
}
