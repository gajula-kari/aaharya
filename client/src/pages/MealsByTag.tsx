import { useParams, Navigate } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import MealCard from '../components/MealCard'
import Spinner from '../components/Spinner'
import { MEAL_TAG } from '../types'
import type { MealTag } from '../types'

const VALID_TAGS: MealTag[] = [MEAL_TAG.CLEAN, MEAL_TAG.INDULGENT]

const TAG_LABEL: Record<MealTag, string> = {
  [MEAL_TAG.CLEAN]: 'Clean',
  [MEAL_TAG.INDULGENT]: 'Indulgent',
}

const styles = {
  page: 'space-y-4 pb-32',
  loadingWrapper: 'flex justify-center py-8',
  pageSection: 'rounded-2xl border border-border bg-surface p-5 shadow-sm',
  pageLabel: 'text-xs font-medium uppercase tracking-widest text-text-muted',
  pageHeading: 'mt-1 text-xl font-semibold text-slate',
  mealGrid: 'columns-2 gap-3',
  emptyState:
    'flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-12 text-center',
  emptyTitle: 'text-sm font-medium text-slate',
  emptySubtitle: 'mt-1 text-xs text-text-muted',
}

export default function MealsByTag() {
  const { tag } = useParams<{ tag: string }>()
  const { meals, loading } = useMealContext()

  const normalised = tag?.toUpperCase() as MealTag
  if (!VALID_TAGS.includes(normalised)) return <Navigate to="/" replace />

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthYear = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  const filtered = meals.filter((m) => {
    const d = new Date(m.occurredAt)
    return d.getFullYear() === year && d.getMonth() === month && m.tag === normalised
  })

  return (
    <div className={styles.page}>
      {loading && (
        <div role="status" aria-label="Loading" className={styles.loadingWrapper}>
          <Spinner />
        </div>
      )}

      <section className={styles.pageSection}>
        <p className={styles.pageLabel}>{monthYear}</p>
        <h1 className={styles.pageHeading}>{TAG_LABEL[normalised]} meals</h1>
      </section>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No meals logged</p>
          <p className={styles.emptySubtitle}>
            No {TAG_LABEL[normalised].toLowerCase()} meals this month.
          </p>
        </div>
      ) : (
        <div className={styles.mealGrid}>
          {filtered.map((meal) => (
            <MealCard key={meal.id} meal={meal} />
          ))}
        </div>
      )}
    </div>
  )
}
