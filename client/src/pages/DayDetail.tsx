import { useRef, useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import MealCard from '../components/MealCard'
import Spinner from '../components/Spinner'
import { MEAL_TAG } from '../types'

const styles = {
  page: 'space-y-4 px-2 pt-3 pb-20',
  loadingWrapper: 'flex justify-center py-8',
  indulgentNotice: 'text-xs text-text-muted px-1',
  indulgentNoticeEm: 'font-semibold text-indulgent',
  mealGrid: 'columns-2 gap-2',
  emptyState: 'flex flex-col items-center gap-4 py-16 text-center',
  emptyTitle: 'text-base font-semibold text-slate',
  emptySubtitle: 'max-w-[300px] text-sm leading-relaxed text-text-muted',
  fabWrapper: 'fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3',
  cameraButton:
    'flex items-center gap-2 whitespace-nowrap rounded-full bg-moss px-6 py-3.5 text-sm font-semibold text-fog shadow-2xl shadow-moss/25 transition hover:bg-moss/90',
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
  const location = useLocation()
  const highlightMealId = (location.state as { highlightMealId?: string } | null)?.highlightMealId
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const mealRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [confirmingMealId, setConfirmingMealId] = useState<string | null>(null)
  const [highlightedMealId, setHighlightedMealId] = useState<string | null>(highlightMealId ?? null)

  useEffect(() => {
    if (!highlightMealId) return
    const el = mealRefs.current[highlightMealId]
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const timer = setTimeout(() => setHighlightedMealId(null), 1500)
    return () => clearTimeout(timer)
  }, [highlightMealId, meals.length])

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

  return (
    <div className={styles.page} onClick={() => setConfirmingMealId(null)}>
      {loading && (
        <div role="status" aria-label="Loading" className={styles.loadingWrapper}>
          <Spinner />
        </div>
      )}

      {isIndulgentDay && (
        <p className={styles.indulgentNotice}>
          <span className={styles.indulgentNoticeEm}>One indulgent meal</span> marks the whole day
          as indulgent.
        </p>
      )}

      {selectedMeals.length > 0 ? (
        <div className={styles.mealGrid}>
          {selectedMeals.map((meal) => (
            <div
              key={meal.id}
              ref={(el) => {
                mealRefs.current[meal.id] = el
              }}
              className={highlightedMealId === meal.id ? 'ring-2 ring-moss rounded-2xl' : ''}
            >
              <MealCard
                meal={meal}
                onTap={() => navigate('/tag', { state: { meal } })}
                onDelete={deleteMeal}
                isConfirming={confirmingMealId === meal.id}
                onConfirmChange={(open) => setConfirmingMealId(open ? meal.id : null)}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <img
            src="/aaharya-icon.svg"
            alt="Aaharya"
            className="h-16 w-16"
            style={{
              filter:
                'brightness(0) saturate(100%) invert(84%) sepia(10%) saturate(406%) hue-rotate(62deg) brightness(95%) contrast(88%)',
            }}
          />
          <div>
            <p className={styles.emptyTitle}>{isToday ? 'No meals yet today' : 'Nothing logged'}</p>
            <p className={styles.emptySubtitle}>
              {isToday ? (
                'Tap Add Meal to log your first meal of the day.'
              ) : (
                <>
                  <span>You didn&apos;t log any meals on this day.</span>
                  <br />
                  <span>Add from your photos if you remember what you ate.</span>
                </>
              )}
            </p>
          </div>
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
