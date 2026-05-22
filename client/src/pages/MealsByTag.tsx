import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import { MEAL_TAG } from '../types'
import type { Meal } from '../types'
import Spinner from '../components/Spinner'

type Tab = 'ALL' | 'CLEAN' | 'INDULGENT'

const styles = {
  page: 'pt-3 pb-8',
  loadingWrapper: 'flex justify-center py-8',
  subheader: 'px-2 pb-3 text-xs text-text-muted',
  tabRow: 'flex gap-1.5 px-2 pb-3',
  tabBase: 'rounded-full border px-3 py-1.5 text-xs font-medium transition',
  tabActive: 'border-slate bg-slate text-fog',
  tabInactive: 'border-border text-text-secondary',
  contextLine: 'px-2 pb-4 text-xs text-text-muted',
  grid: 'grid grid-cols-3 gap-1',
  gridItem: 'relative aspect-square cursor-pointer overflow-hidden bg-fog',
  gridImage: 'w-full h-full object-cover',
  gridNoImage: 'w-full h-full flex items-center justify-center',
  gridNoImageText: 'text-[10px] text-text-muted',
  tagDot: 'absolute top-1.5 left-1.5 h-3 w-3 rounded-full ring-1 ring-surface shadow-sm',
  tagDotClean: 'bg-moss',
  tagDotIndulgent: 'bg-indulgent',
  emptyState: 'flex flex-col items-center py-16 text-center px-2',
  emptyTitle: 'text-sm font-medium text-slate',
  emptySubtitle: 'mt-1 text-xs text-text-muted',
  // overlay
  overlayBg: 'fixed inset-0 z-50 bg-slate/80 flex flex-col items-center justify-center p-5',
  overlayWrapper: 'relative w-full max-w-sm',
  overlayCard: 'rounded-2xl bg-surface overflow-hidden shadow-2xl',
  overlayImageWrapper: 'relative',
  overlayImage: 'w-full aspect-square object-cover',
  overlayNoImage:
    'w-full aspect-square bg-fog flex items-center justify-center text-text-muted text-sm',
  overlayClose: 'absolute top-3 right-3 p-1.5 rounded-full bg-slate/60 text-fog',
  overlayBody: 'p-4 space-y-2',
  overlayMeta: 'flex items-center justify-between gap-2',
  overlayDate: 'text-xs text-text-muted',
  overlayTagPill: 'rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex-shrink-0',
  overlayTagClean: 'bg-moss/15 text-moss',
  overlayTagIndulgent: 'bg-indulgent/15 text-indulgent',
  overlayNote: 'text-sm text-slate leading-relaxed',
  overlayAmount: 'text-xs text-text-muted',
  overlayActions: 'flex justify-end pt-1',
  overlayEditBtn: 'rounded-full bg-slate px-4 py-2 text-xs font-semibold text-fog',
}

export default function MealsByTag() {
  const { meals, loading } = useMealContext()
  const navigate = useNavigate()
  const location = useLocation()

  const initialTab = (location.state as { initialTab?: Tab } | null)?.initialTab ?? 'ALL'
  const [activeTab, setActiveTab] = useState<Tab>(initialTab)
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null)
  const touchStartY = useRef(0)

  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()
  const monthYear = today.toLocaleString('default', { month: 'long', year: 'numeric' })

  const thisMonthMeals = meals
    .filter((m) => {
      const d = new Date(m.occurredAt)
      return d.getFullYear() === year && d.getMonth() === month
    })
    .sort((a, b) => b.occurredAt - a.occurredAt)

  const cleanMeals = thisMonthMeals.filter((m) => m.tag === MEAL_TAG.CLEAN)
  const indulgentMeals = thisMonthMeals.filter((m) => m.tag === MEAL_TAG.INDULGENT)

  const filtered =
    activeTab === 'ALL' ? thisMonthMeals : activeTab === 'CLEAN' ? cleanMeals : indulgentMeals

  useEffect(() => {
    if (!selectedMeal) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setSelectedMeal(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedMeal])

  function handleEdit(meal: Meal) {
    const d = new Date(meal.occurredAt)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    setSelectedMeal(null)
    navigate(`/day/${dateStr}`, { state: { highlightMealId: meal.id } })
  }

  return (
    <div className={styles.page}>
      {loading && (
        <div role="status" aria-label="Loading" className={styles.loadingWrapper}>
          <Spinner />
        </div>
      )}

      <p className={styles.subheader}>
        {monthYear} · {thisMonthMeals.length} {thisMonthMeals.length === 1 ? 'meal' : 'meals'}
      </p>

      <div className={styles.tabRow}>
        {(['ALL', 'CLEAN', 'INDULGENT'] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`${styles.tabBase} ${activeTab === tab ? styles.tabActive : styles.tabInactive}`}
          >
            {tab === 'ALL' ? 'All' : tab === 'CLEAN' ? 'Clean' : 'Indulgent'}
          </button>
        ))}
      </div>

      <p className={styles.contextLine}>
        {cleanMeals.length} clean · {indulgentMeals.length} indulgent
      </p>

      {filtered.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyTitle}>No meals yet</p>
          <p className={styles.emptySubtitle}>
            No {activeTab === 'ALL' ? '' : activeTab.toLowerCase() + ' '}meals this month.
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((meal) => (
            <div key={meal.id} className={styles.gridItem} onClick={() => setSelectedMeal(meal)}>
              {meal.imageUrl ? (
                <img src={meal.imageUrl} alt={`${meal.tag} meal`} className={styles.gridImage} />
              ) : (
                <div className={styles.gridNoImage}>
                  <span className={styles.gridNoImageText}>No image</span>
                </div>
              )}
              <div
                className={`${styles.tagDot} ${meal.tag === MEAL_TAG.CLEAN ? styles.tagDotClean : styles.tagDotIndulgent}`}
              />
            </div>
          ))}
        </div>
      )}

      {selectedMeal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Meal detail"
          className={styles.overlayBg}
          onClick={() => setSelectedMeal(null)}
        >
          <div
            className={styles.overlayWrapper}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => {
              touchStartY.current = e.touches[0].clientY
            }}
            onTouchEnd={(e) => {
              if (e.changedTouches[0].clientY - touchStartY.current > 80) setSelectedMeal(null)
            }}
          >
            <div className={styles.overlayCard}>
              <div className={styles.overlayImageWrapper}>
                {selectedMeal.imageUrl ? (
                  <img
                    src={selectedMeal.imageUrl}
                    alt={`${selectedMeal.tag} meal`}
                    className={styles.overlayImage}
                  />
                ) : (
                  <div className={styles.overlayNoImage}>No image</div>
                )}
                <button
                  type="button"
                  aria-label="Close"
                  className={styles.overlayClose}
                  onClick={() => setSelectedMeal(null)}
                >
                  <XIcon />
                </button>
              </div>
              <div className={styles.overlayBody}>
                <div className={styles.overlayMeta}>
                  <span className={styles.overlayDate}>
                    {formatDateTime(selectedMeal.occurredAt)}
                  </span>
                  <span
                    className={`${styles.overlayTagPill} ${selectedMeal.tag === MEAL_TAG.CLEAN ? styles.overlayTagClean : styles.overlayTagIndulgent}`}
                  >
                    {selectedMeal.tag === MEAL_TAG.CLEAN ? 'Clean' : 'Indulgent'}
                  </span>
                </div>
                {selectedMeal.note && <p className={styles.overlayNote}>{selectedMeal.note}</p>}
                {selectedMeal.amountSpent != null && (
                  <p className={styles.overlayAmount}>₹{selectedMeal.amountSpent}</p>
                )}
                <div className={styles.overlayActions}>
                  <button
                    type="button"
                    onClick={() => handleEdit(selectedMeal)}
                    className={styles.overlayEditBtn}
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function formatDateTime(ts: number): string {
  const d = new Date(ts)
  return (
    d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

function XIcon() {
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
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}
