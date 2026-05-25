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

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function statusToClasses(status: DayStatus): string {
  switch (status) {
    case 'clean':
      return 'bg-clean text-clean-text'
    case 'indulgent':
      return 'bg-indulgent text-surface'
    case 'overlimit':
      return 'bg-overlimit text-surface'
    case 'empty':
      return 'border border-[0.5px] border-border bg-surface text-text-muted'
    case 'future':
      return 'text-text-disabled opacity-20'
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

  // Calculate Monday-start offset
  const firstDay = new Date(year, month, 1).getDay()
  const offset = (firstDay + 6) % 7 // Mon = 0, Sun = 6

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

  return (
    <div
      className="absolute -left-[9999px] top-0 w-[480px] rounded-2xl bg-fog p-6"
      style={{
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Month label */}
      <p className="mb-6 text-center text-[11px] font-medium tracking-widest uppercase text-text-muted">
        {monthName} {year}
      </p>

      {/* Calendar grid */}
      <div className="mb-6 grid grid-cols-7 gap-1">
        {/* Day headers */}
        {DAY_LABELS.map((label, idx) => (
          <div
            key={`day-header-${idx}`}
            className="py-1 text-center text-[9px] font-normal text-text-disabled"
          >
            {label}
          </div>
        ))}

        {/* Offset empty cells */}
        {Array.from({ length: offset }).map((_, i) => (
          <div key={`offset-${i}`} />
        ))}

        {/* Days */}
        {days.map((day) => {
          const dayInfo = dayStatuses.get(day)!
          const statusClasses = statusToClasses(dayInfo.status)
          const todayClasses = dayInfo.isToday ? 'ring-2 ring-moss ring-offset-1' : ''

          return (
            <div
              key={day}
              className={`flex h-[52px] w-[52px] items-center justify-center rounded-xl text-xs font-semibold transition ${statusClasses} ${todayClasses}`}
            >
              {day}
            </div>
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
