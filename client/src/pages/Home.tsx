import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AddMealFAB from '../components/AddMealFAB'
import Calendar from '../components/Calendar'
import InstallBanner from '../components/InstallBanner'
import Spinner from '../components/Spinner'
import { useMealContext } from '../hooks/useMealContext'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { fetchEarliestMonth } from '../services/mealApi'
import { getGoalForMonth } from '../utils/goalHistory'
import { ERROR_MESSAGES } from '../constants/errors'
import { MEAL_TAG } from '../types'

const INDULGENT_RULE_KEY = 'aaharya_seen_indulgent_rule'
const INDULGENT_RULE_TEXT = 'One indulgent meal marks the whole day as indulgent.'

const styles = {
  page: 'relative space-y-2 px-3 pt-3 pb-20',
  error: 'text-xs text-overlimit',
  // calendar card
  calendarSection: 'rounded-lg border border-border bg-surface p-5 space-y-3',
  calendarHeader: 'flex items-center',
  navRow: 'flex items-center gap-2 flex-1',
  monthHeading: 'text-base font-normal text-slate',
  navBtn: 'p-1 text-slate',
  legend: 'flex items-center gap-3',
  legendItem: 'flex items-center gap-1.5 text-[11px] text-text-muted',
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
  statCell: 'px-5 py-4 min-h-[80px]',
  statValue: 'text-2xl font-semibold',
  statValueClean: 'text-slate',
  statValueIndulgent: 'text-indulgent',
  statValueOver: 'text-overlimit',
  statLabel: 'mt-0.5 text-xs text-text-muted',
  viewAllRow: 'flex justify-end px-1',
  viewAllBtn: 'text-sm text-moss',
  // one-time bottom sheet
  sheetOverlay: 'fixed inset-0 z-40 bg-slate/40',
  sheet:
    'fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-2xl bg-surface px-5 py-5 shadow-2xl',
  sheetInner: 'flex items-center justify-between gap-4',
  sheetText: 'text-sm leading-relaxed text-slate',
  sheetDismiss: 'flex-shrink-0 rounded-full bg-moss p-2.5 text-surface transition hover:bg-moss/90',
}

/** Return the smaller of two "YYYY-MM" strings, or the non-null one if only one exists. */
function minMonth(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
}

export default function Home() {
  const { meals, error, refetch, fetchMonth, fetchingMonths } = useMealContext()
  const { settings, settingsLoading, settingsError } = useSettingsContext()
  const navigate = useNavigate()

  const [monthOffset, setMonthOffset] = useState(
    () => parseInt(sessionStorage.getItem('home_month_offset') ?? '0', 10) || 0
  )
  const [earliestMonth, setEarliestMonth] = useState<string | null>(null)
  const [earliestMonthLoading, setEarliestMonthLoading] = useState(true)

  const today = new Date()
  // displayDate is always day 1 of the displayed month
  const displayDate = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const displayYear = displayDate.getFullYear()
  const displayMonth = displayDate.getMonth() // 0-indexed

  // Persist monthOffset so back-navigation from DayDetail restores the correct month
  useEffect(() => {
    sessionStorage.setItem('home_month_offset', String(monthOffset))
  }, [monthOffset])

  // Fetch the earliest month once on mount to set the backward nav limit
  useEffect(() => {
    fetchEarliestMonth()
      .then((m) => setEarliestMonth(m))
      .catch(() => setEarliestMonth(null))
      .finally(() => setEarliestMonthLoading(false))
  }, [])

  // Lazy-load data when navigating to a month not yet in context
  useEffect(() => {
    if (monthOffset !== 0) {
      void fetchMonth(displayYear, displayMonth)
    }
  }, [displayYear, displayMonth, fetchMonth, monthOffset])

  // Backward limit = min(earliestMealMonth, oldest goalHistory entry).
  // goalHistory is kept sorted ascending by the server, so [0] is always the earliest.
  const goalHistoryStart = settings?.goalHistory?.[0]?.month ?? null
  // DEV ONLY: override earliest month to test backward navigation.
  // Usage in browser console: localStorage.setItem('__dev_earliest_month', '2026-04') then refresh
  // Clear with: localStorage.removeItem('__dev_earliest_month')
  const devEarliestOverride = import.meta.env.DEV
    ? (localStorage.getItem('__dev_earliest_month') ?? null)
    : null
  const backwardLimit = minMonth(devEarliestOverride ?? earliestMonth, goalHistoryStart)
  const displayMonthKey = `${displayYear}-${String(displayMonth + 1).padStart(2, '0')}`
  const isPrevDisabled =
    earliestMonthLoading || backwardLimit === null || displayMonthKey <= backwardLimit
  const isNextDisabled = monthOffset >= 0

  const monthName = displayDate.toLocaleString('default', { month: 'long' })
  const monthYearLabel = `${monthName} ${displayYear}`

  // Pull-to-refresh re-fetches the currently displayed month
  const handleRefresh = useCallback(
    () => refetch(displayYear, displayMonth),
    [refetch, displayYear, displayMonth]
  )
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh(handleRefresh)

  // Goal for the displayed month: use goalHistory if available, else fall back to current setting
  const monthlyGoal = settings?.goalHistory?.length
    ? getGoalForMonth(settings.goalHistory, displayYear, displayMonth)
    : (settings?.currentMonthlyLimit ?? null)

  const thisMonthMeals = meals.filter((m) => {
    const d = new Date(m.occurredAt)
    return d.getFullYear() === displayYear && d.getMonth() === displayMonth
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

  // One-time bottom sheet — only shown on the current month
  const [sheetDismissed, setSheetDismissed] = useState(
    () => !!localStorage.getItem(INDULGENT_RULE_KEY)
  )
  const showSheet = monthOffset === 0 && indulgentDays > 0 && !sheetDismissed

  function dismissSheet() {
    localStorage.setItem(INDULGENT_RULE_KEY, 'true')
    setSheetDismissed(true)
  }

  return (
    <div className={styles.page} ref={containerRef}>
      <div
        aria-hidden
        style={{
          height: isRefreshing ? '48px' : `${pullDistance}px`,
          transition: pullDistance === 0 && !isRefreshing ? 'height 0.2s ease' : 'none',
        }}
        className="flex items-center justify-center overflow-hidden"
      >
        {(pullDistance >= 32 || isRefreshing) && <Spinner size="sm" />}
      </div>

      <InstallBanner />

      {error && <p className={styles.error}>{ERROR_MESSAGES.LOAD_MEALS_FAILED}</p>}

      <section className={styles.calendarSection}>
        <div className={styles.calendarHeader}>
          <div className={styles.navRow}>
            {!isPrevDisabled && (
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setMonthOffset((o) => o - 1)}
                className={styles.navBtn}
              >
                <ChevronLeftIcon />
              </button>
            )}
            <h2 className={styles.monthHeading}>{monthYearLabel}</h2>
            {!isNextDisabled && (
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setMonthOffset((o) => o + 1)}
                className={styles.navBtn}
              >
                <ChevronRightIcon />
              </button>
            )}
          </div>
          <div className={styles.legend}>
            {cleanDays > 0 && (
              <span className={styles.legendItem}>
                <span className={styles.legendDotClean} />
                Clean
              </span>
            )}
            {indulgentDays > 0 && (
              <span className={styles.legendItem}>
                <span className={styles.legendDotIndulgent} />
                Indulgent
              </span>
            )}
          </div>
        </div>

        {fetchingMonths.has(displayMonthKey) ? (
          <div role="status" aria-label="Loading" className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : (
          <Calendar displayDate={displayDate} monthlyGoal={monthlyGoal} />
        )}
      </section>

      {settingsError && <p className={styles.error}>{settingsError}</p>}

      <section
        className={`${styles.statsCard} ${isOverLimit ? styles.statsCardOver : styles.statsCardNormal}`}
      >
        {settingsLoading ? (
          <div className={`${styles.limitSection} flex justify-center`}>
            <Spinner size="sm" className="text-text-subtle" />
          </div>
        ) : monthlyGoal != null ? (
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
        ) : null}
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

      {dayEntries.length >= 2 && (
        <div className={styles.viewAllRow}>
          <button
            type="button"
            onClick={() =>
              navigate('/meals', { state: { year: displayYear, month: displayMonth } })
            }
            className={styles.viewAllBtn}
          >
            View all
          </button>
        </div>
      )}

      {monthOffset === 0 && <AddMealFAB />}

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

function ChevronLeftIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
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

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
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
