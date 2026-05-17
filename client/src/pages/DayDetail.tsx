import { useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import MealCard from '../components/MealCard'
import Spinner from '../components/Spinner'
import { MEAL_TAG } from '../types'

const styles = {
  page: 'space-y-4 pb-32',
  loadingWrapper: 'flex justify-center py-8',
  dateSection: 'rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-2',
  dateLabel: 'text-xs font-medium uppercase tracking-widest text-text-muted',
  dateHeading: 'text-xl font-semibold text-slate',
  pastBadge: 'ml-2 text-xs font-normal text-text-muted',
  indulgentHint: 'text-xs text-text-muted leading-relaxed',
  mealGrid: 'columns-2 gap-3',
  emptyState:
    'flex flex-col items-center justify-center rounded-2xl border border-border bg-surface py-12 text-center',
  emptyTitle: 'text-sm font-medium text-slate',
  emptySubtitle: 'mt-1 text-xs text-text-muted',
  fabWrapper: 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3',
  cameraButton:
    'flex items-center gap-2 whitespace-nowrap rounded-full bg-moss px-6 py-4 text-sm font-semibold text-fog shadow-2xl shadow-moss/25 transition hover:bg-moss/90',
  galleryButton:
    'rounded-full border border-border bg-surface p-3.5 text-moss shadow-lg transition hover:bg-fog',
  addPhotosButton:
    'fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface px-5 py-3 text-sm text-text-secondary shadow-lg transition hover:bg-fog',
  hiddenInput: 'hidden',
}

export default function DayDetail() {
  const { date } = useParams<{ date: string }>()
  const { meals, loading, deleteMeal } = useMealContext()
  const navigate = useNavigate()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>, source: 'camera' | 'gallery') {
    const file = e.target.files?.[0]
    if (file) navigate('/tag', { state: { image: file, date, source } })
  }

  const [y, m, d] = (date ?? '').split('-').map(Number)
  const selectedDate = new Date(y, m - 1, d)
  const isToday = selectedDate.toDateString() === new Date().toDateString()
  const selectedMeals = meals.filter(
    (meal) => new Date(meal.occurredAt).toDateString() === selectedDate.toDateString()
  )
  const isIndulgentDay = selectedMeals.some((m) => m.tag === MEAL_TAG.INDULGENT)

  const formattedDate = selectedDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={styles.page}>
      {loading && (
        <div role="status" aria-label="Loading" className={styles.loadingWrapper}>
          <Spinner />
        </div>
      )}

      <section className={styles.dateSection}>
        <p className={styles.dateLabel}>Day</p>
        <h1 className={styles.dateHeading}>
          {formattedDate}
          {!isToday && <span className={styles.pastBadge}>· past</span>}
        </h1>
        {isIndulgentDay && (
          <p className={styles.indulgentHint}>
            One indulgent meal marks the whole day as indulgent.
          </p>
        )}
      </section>

      {selectedMeals.length > 0 ? (
        <div className={styles.mealGrid}>
          {selectedMeals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              onTap={() => navigate('/tag', { state: { meal } })}
              onDelete={deleteMeal}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No meals logged</p>
          <p className={styles.emptySubtitle}>Tap Add Meal to log one.</p>
        </div>
      )}

      {isToday ? (
        <>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handleFileChange(e, 'camera')}
            className={styles.hiddenInput}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'gallery')}
            className={styles.hiddenInput}
          />
          <div className={styles.fabWrapper}>
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={styles.cameraButton}
            >
              <CameraIcon /> Add Meal
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              aria-label="Choose from gallery"
              className={styles.galleryButton}
            >
              <GalleryIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleFileChange(e, 'gallery')}
            className={styles.hiddenInput}
          />
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            className={styles.addPhotosButton}
          >
            <GalleryIcon /> Add from Photos
          </button>
        </>
      )}
    </div>
  )
}

function CameraIcon() {
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
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}

function GalleryIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}
