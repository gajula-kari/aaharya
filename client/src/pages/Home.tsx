import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AddMealFAB from '../components/AddMealFAB'
import Calendar from '../components/Calendar'
import InstallBanner from '../components/InstallBanner'
import { useMealContext } from '../hooks/useMealContext'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { MEAL_TAG } from '../types'

const INDULGENT_RULE_KEY = 'aaharya_seen_indulgent_rule'
const INDULGENT_RULE_TEXT = 'One indulgent meal marks the whole day as indulgent.'

const styles = {
  page: 'relative space-y-2 px-2 pt-3 pb-32',
  error: 'text-xs text-overlimit',
  // calendar card
  calendarSection: 'rounded-lg border border-border bg-surface p-5 space-y-3',
  calendarHeader: 'flex items-center justify-between',
  monthHeading: 'text-base font-normal text-slate',
  legend: 'flex items-center gap-3',
  legendItem:
    'flex items-center gap-1.5 text-[11px] text-text-muted transition hover:text-text-secondary',
  legendDotClean: 'h-2.5 w-2.5 rounded-full bg-clean',
  legendDotIndulgent: 'h-2.5 w-2.5 rounded-full bg-indulgent',
  // stats card — base + state variants
  statsCard: 'rounded-lg border bg-surface overflow-hidden',
  statsCardNormal: 'border-border',
  statsCardOver: 'border-overlimit',
  // limit section
  limitSection: 'px-5 pt-4 pb-3 space-y-2.5',
  limitHeader: 'flex items-center justify-between',
  limitLabel: 'text-xs text-text-muted',
  limitCount: 'text-sm font-medium text-indulgent',
  limitCountZero: 'text-sm font-medium text-slate',
  limitCountOver: 'text-sm font-medium text-overlimit',
  // segmented bar
  barRow: 'flex gap-1',
  barSegmentFilled: 'h-2 flex-1 rounded-full bg-indulgent',
  barSegmentEmpty: 'h-2 flex-1 rounded-full bg-border',
  barOverLimit: 'h-2 w-full rounded-full bg-overlimit',
  // days row
  daysRow: 'grid grid-cols-2 divide-x divide-border border-t border-border',
  statCell: 'px-5 py-4',
  statValue: 'text-2xl font-semibold',
  statValueClean: 'text-slate',
  statValueIndulgent: 'text-indulgent',
  statValueOver: 'text-overlimit',
  statLabel: 'mt-0.5 text-xs text-text-muted',
  // one-time bottom sheet
  sheetOverlay: 'fixed inset-0 z-40 bg-slate/40',
  sheet:
    'fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-2xl bg-surface px-5 py-5 shadow-2xl',
  sheetInner: 'flex items-center justify-between gap-4',
  sheetText: 'text-sm leading-relaxed text-slate',
  sheetDismiss: 'flex-shrink-0 rounded-full bg-moss p-2.5 text-surface transition hover:bg-moss/90',
}

export default function Home() {
  const { meals, error } = useMealContext()
  const { settings } = useSettingsContext()
  const navigate = useNavigate()

  const monthlyGoal = settings?.monthlyIndulgentLimit ?? null

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  const thisMonthMeals = meals.filter((m) => {
    const d = new Date(m.occurredAt)
    return d.getFullYear() === year && d.getMonth() === month
  })

  const mealsByDay: Record<string, typeof meals> = {}
  thisMonthMeals.forEach((m) => {
    const key = new Date(m.occurredAt).toDateString()
    if (!mealsByDay[key]) mealsByDay[key] = []
    mealsByDay[key].push(m)
  })

  const dayEntries = Object.values(mealsByDay)
  const cleanDays = dayEntries.filter((d) => d.every((m) => m.tag === MEAL_TAG.CLEAN)).length
  const indulgentDays = dayEntries.filter((d) => d.some((m) => m.tag === MEAL_TAG.INDULGENT)).length

  const isAtLimit = monthlyGoal != null && indulgentDays === monthlyGoal
  const isOverLimit = monthlyGoal != null && indulgentDays > monthlyGoal

  // one-time bottom sheet — shown first time an indulgent day appears
  const [showSheet, setShowSheet] = useState(false)

  useEffect(() => {
    if (indulgentDays > 0 && !localStorage.getItem(INDULGENT_RULE_KEY)) {
      setShowSheet(true)
    }
  }, [indulgentDays])

  function dismissSheet() {
    localStorage.setItem(INDULGENT_RULE_KEY, 'true')
    setShowSheet(false)
  }

  return (
    <div className={styles.page}>
      <InstallBanner />

      {error && <p className={styles.error}>Failed to load meals. Please try again later.</p>}

      <section className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <h2 className={styles.monthHeading}>{getCurrentMonthYear()}</h2>
          <div className={styles.legend}>
            {cleanDays > 0 && (
              <button
                type="button"
                onClick={() => navigate('/meals/clean')}
                className={styles.legendItem}
              >
                <span className={styles.legendDotClean} />
                Clean
              </button>
            )}
            {indulgentDays > 0 && (
              <button
                type="button"
                onClick={() => navigate('/meals/indulgent')}
                className={styles.legendItem}
              >
                <span className={styles.legendDotIndulgent} />
                Indulgent
              </button>
            )}
          </div>
        </div>

        <Calendar />
      </section>

      <section
        className={`${styles.statsCard} ${isOverLimit ? styles.statsCardOver : styles.statsCardNormal}`}
      >
        {monthlyGoal != null && (
          <div className={styles.limitSection}>
            <div className={styles.limitHeader}>
              <span className={styles.limitLabel}>indulgent limit</span>
              <span
                className={
                  isOverLimit
                    ? styles.limitCountOver
                    : isAtLimit
                      ? styles.limitCount
                      : styles.limitCountZero
                }
              >
                {indulgentDays} / {monthlyGoal}
              </span>
            </div>
            <IndulgentBar indulgentDays={indulgentDays} goal={monthlyGoal} />
          </div>
        )}
        <div className={styles.daysRow}>
          <div className={styles.statCell}>
            <p className={`${styles.statValue} ${styles.statValueClean}`}>{cleanDays}</p>
            <p className={styles.statLabel}>clean days</p>
          </div>
          <div className={styles.statCell}>
            <p
              className={`${styles.statValue} ${isOverLimit ? styles.statValueOver : indulgentDays > 0 ? styles.statValueIndulgent : styles.statValueClean}`}
            >
              {indulgentDays}
            </p>
            <p className={styles.statLabel}>indulgent days</p>
          </div>
        </div>
      </section>

      <AddMealFAB />

      {showSheet && (
        <>
          <div className={styles.sheetOverlay} onClick={dismissSheet} />
          <div className={styles.sheet}>
            <div className={styles.sheetInner}>
              <p className={styles.sheetText}>{INDULGENT_RULE_TEXT}</p>
              <button
                type="button"
                onClick={dismissSheet}
                aria-label="Got it"
                className={styles.sheetDismiss}
              >
                <CheckIcon />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function IndulgentBar({ indulgentDays, goal }: { indulgentDays: number; goal: number }) {
  if (indulgentDays > goal) {
    return <div className={styles.barOverLimit} />
  }
  return (
    <div className={styles.barRow}>
      {Array.from({ length: goal }).map((_, i) => (
        <div
          key={i}
          className={i < indulgentDays ? styles.barSegmentFilled : styles.barSegmentEmpty}
        />
      ))}
    </div>
  )
}

function CheckIcon() {
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function getCurrentMonthYear(): string {
  const today = new Date()
  const year = today.getFullYear()
  const monthName = today.toLocaleString('default', { month: 'long' })
  return `${monthName} ${year}`
}
