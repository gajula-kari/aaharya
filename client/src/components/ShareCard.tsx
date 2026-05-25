import { computeDayStatuses, type DayStatus } from '../utils/computeDayStatuses'
import { generateHeadline } from '../utils/shareHeadline'
import type { Meal } from '../types'

interface ShareCardProps {
  meals: Meal[]
  monthlyGoal: number | null
  month: number // 0-indexed
  year: number
  userMessage?: string
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const styles = {
  grid: 'grid grid-cols-7 gap-1',
  dayHeader: 'py-1 text-center text-[9px] font-normal text-text-disabled',
  dayButton:
    'flex aspect-square items-center justify-center rounded-xl text-xs font-semibold transition',
  dayEmpty: 'border border-[0.5px] border-border bg-surface text-text-muted',
  dayClean: 'bg-clean text-clean-text',
  dayIndulgent: 'bg-indulgent text-surface',
  dayOverLimit: 'bg-overlimit text-surface',
  dayFuture: 'text-text-disabled opacity-20',
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

export default function ShareCard({
  meals,
  monthlyGoal,
  month,
  year,
  userMessage,
}: ShareCardProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Compute day statuses
  const dayStatuses = computeDayStatuses(meals, month, year, monthlyGoal)

  // Count indulgent days (for headline)
  const indulgentDays = new Set(
    meals
      .filter((m) => {
        const d = new Date(m.occurredAt)
        return d.getFullYear() === year && d.getMonth() === month && m.tag === 'INDULGENT'
      })
      .map((m) => new Date(m.occurredAt).toDateString())
  ).size

  const { headline, subtext } = generateHeadline(indulgentDays, monthlyGoal)

  const monthName = new Date(year, month).toLocaleString('default', { month: 'long' }).toUpperCase()

  function getStartOffset(): number {
    const firstDay = new Date(year, month, 1).getDay()
    return (firstDay + 6) % 7 // Mon = 0, Sun = 6
  }

  return (
    <div className="w-full space-y-3 rounded-lg border border-border bg-surface p-5">
      {/* Month label */}
      <p className="text-base font-normal text-slate">
        {monthName} {year}
      </p>

      {/* Calendar grid - matching Calendar.tsx exactly */}
      <div className={styles.grid}>
        {/* Day headers */}
        {DAY_LABELS.map((label) => (
          <div key={label} className={styles.dayHeader}>
            {label}
          </div>
        ))}

        {/* Offset empty cells */}
        {Array.from({ length: getStartOffset() }).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {/* Days */}
        {days.map((day) => {
          const dayInfo = dayStatuses.get(day)!
          const dayStyle = statusToStyleKey(dayInfo.status)

          return (
            <button
              key={day}
              type="button"
              disabled={dayInfo.status === 'future'}
              className={`${styles.dayButton} ${dayStyle} ${dayInfo.isToday ? styles.dayToday : ''}`}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* Headline */}
      <h2
        className="mb-2 text-center text-[22px] font-normal text-slate"
        style={{ fontFamily: 'Fraunces, serif' }}
      >
        {headline}
      </h2>

      {/* Subtext */}
      <p className="mb-6 text-center text-[13px] text-text-secondary">{subtext}</p>

      {/* User message box (if present) */}
      {userMessage && (
        <div className="mb-6 rounded-xl border border-border bg-surface px-3 py-2.5 text-[12px] italic text-clean-text">
          {userMessage}
        </div>
      )}

      {/* Divider */}
      <div className="mb-6 h-[0.5px] w-full bg-border" />

      {/* Footer */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] text-text-disabled">track yours at</span>
        <span
          className="text-[14px] font-normal text-moss"
          style={{ fontFamily: 'Fraunces, serif' }}
        >
          aaharya
        </span>
      </div>
    </div>
  )
}
