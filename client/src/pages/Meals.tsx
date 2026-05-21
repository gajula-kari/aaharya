import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useMealContext } from '../hooks/useMealContext'
import { MEAL_TAG } from '../types'
import type { Meal } from '../types'
import Spinner from '../components/Spinner'

type Tab = 'ALL' | 'CLEAN' | 'INDULGENT'

const styles = {
  page: 'px-2 pt-3 pb-8',
  loadingWrapper: 'flex justify-center py-8',
  tabRow: 'flex gap-5 pb-3',
  tabBase: 'border-b-2 pb-1 text-sm font-medium transition',
  tabActiveAll: 'border-slate text-slate',
  tabActiveClean: 'border-moss text-slate',
  tabActiveIndulgent: 'border-indulgent text-slate',
  tabInactive: 'border-transparent text-text-muted',
  contextLine: 'pb-4 text-xs text-text-muted',
  // grid (3+ meals)
  grid: 'grid grid-cols-3 gap-2',
  gridItem:
    'relative aspect-square cursor-pointer bg-surface rounded-xl border border-border shadow-sm p-[3px]',
  gridInner: 'absolute inset-[3px] overflow-hidden rounded-[10px]',
  gridImage: 'w-full h-full object-cover',
  gridNoImage: 'w-full h-full flex items-center justify-center',
  gridNoImageText: 'text-[10px] text-text-muted',
  timeLabel: 'absolute bottom-1 left-1.5 text-[9px] text-surface/90 font-medium leading-none',
  tagDot: 'absolute top-1.5 left-1.5 h-3 w-3 rounded-full ring-1 ring-surface shadow-sm',
  tagDotClean: 'bg-moss',
  tagDotIndulgent: 'bg-indulgent',
  // list (1–2 meals)
  list: 'space-y-2',
  listItem:
    'flex cursor-pointer gap-3 rounded-xl border border-border bg-surface p-3 shadow-sm transition hover:shadow-md',
  listThumb: 'h-16 w-16 shrink-0 overflow-hidden rounded-lg',
  listThumbImg: 'h-full w-full object-cover',
  listThumbEmpty: 'h-full w-full flex items-center justify-center bg-fog',
  listBody: 'flex min-w-0 flex-1 flex-col justify-between',
  listTop: 'flex items-center gap-1.5',
  listTagDot: 'h-2 w-2 shrink-0 rounded-full',
  listTag: 'text-xs font-medium text-slate',
  listTime: 'text-xs text-text-muted',
  listNote: 'truncate text-xs text-text-secondary',
  listAmount: 'text-xs text-text-muted',
  emptyState: 'flex flex-col items-center gap-4 py-16 text-center',
  emptyTitle: 'text-base font-semibold text-slate',
  emptySubtitle: 'max-w-[300px] text-sm leading-relaxed text-text-muted',
  // overlay
  overlayBg: 'fixed inset-0 z-50 bg-slate/80 flex flex-col items-center justify-center p-5',
  overlayWrapper: 'relative w-full max-w-sm',
  overlayCard: 'rounded-2xl bg-surface overflow-hidden shadow-2xl',
  overlayImageWrapper: 'relative',
  overlayImage: 'w-full aspect-square object-cover',
  overlayNoImage:
    'w-full aspect-square bg-fog flex items-center justify-center text-text-muted text-sm',
  overlayClose: 'absolute top-3 right-3 p-1.5 rounded-full bg-slate/60 text-fog',
  overlayTagDot: 'absolute top-3 left-3 h-4 w-4 rounded-full ring-2 ring-surface shadow-sm',
  overlayTagDotClean: 'bg-moss',
  overlayTagDotIndulgent: 'bg-indulgent',
  overlayBody: 'p-4 space-y-2',
  overlayMeta: 'flex items-center justify-between gap-2',
  overlayDate: 'text-xs text-text-muted',
  overlayEditIconBtn: 'p-1.5 rounded-full text-text-muted transition hover:text-slate hover:bg-fog',
  overlayNote: 'text-sm text-slate leading-relaxed',
  overlayAmount: 'text-xs text-text-muted',
}

export default function Meals() {
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

      {thisMonthMeals.length > 0 && (
        <>
          <div className={styles.tabRow}>
            {(['ALL', 'CLEAN', 'INDULGENT'] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`${styles.tabBase} ${
                  activeTab === tab
                    ? tab === 'CLEAN'
                      ? styles.tabActiveClean
                      : tab === 'INDULGENT'
                        ? styles.tabActiveIndulgent
                        : styles.tabActiveAll
                    : styles.tabInactive
                }`}
              >
                {tab === 'ALL' ? 'All' : tab === 'CLEAN' ? 'Clean' : 'Indulgent'}
              </button>
            ))}
          </div>
          <p className={styles.contextLine}>
            {cleanMeals.length} clean · {indulgentMeals.length} indulgent
          </p>
        </>
      )}

      {filtered.length === 0 ? (
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
            <p className={styles.emptyTitle}>
              {activeTab === 'ALL'
                ? 'No meals this month'
                : activeTab === 'CLEAN'
                  ? 'No clean meals yet'
                  : 'No indulgent meals yet'}
            </p>
            <p className={styles.emptySubtitle}>
              {activeTab === 'ALL'
                ? 'Start logging meals to see them here.'
                : activeTab === 'CLEAN'
                  ? 'Log a meal and tag it as clean.'
                  : 'Indulgent meals will appear here when logged.'}
            </p>
          </div>
        </div>
      ) : filtered.length < 3 ? (
        <div className={styles.list}>
          {filtered.map((meal) => (
            <div key={meal.id} className={styles.listItem} onClick={() => setSelectedMeal(meal)}>
              <div className={styles.listThumb}>
                {meal.imageUrl ? (
                  <img
                    src={meal.imageUrl}
                    alt={`${meal.tag} meal`}
                    className={styles.listThumbImg}
                  />
                ) : (
                  <div className={styles.listThumbEmpty} />
                )}
              </div>
              <div className={styles.listBody}>
                <div className={styles.listTop}>
                  <div
                    className={`${styles.listTagDot} ${meal.tag === MEAL_TAG.CLEAN ? styles.tagDotClean : styles.tagDotIndulgent}`}
                  />
                  <span className={styles.listTag}>
                    {meal.tag === MEAL_TAG.CLEAN ? 'Clean' : 'Indulgent'}
                  </span>
                </div>
                <span className={styles.listTime}>
                  {(() => {
                    const d = new Date(meal.occurredAt)
                    const day =
                      d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.getDate()
                    const time = d.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })
                    return `${day} · ${time}`
                  })()}
                </span>
                {meal.note && <p className={styles.listNote}>{meal.note}</p>}
                {meal.amountSpent != null && (
                  <p className={styles.listAmount}>₹{meal.amountSpent}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((meal) => (
            <div key={meal.id} className={styles.gridItem} onClick={() => setSelectedMeal(meal)}>
              <div className={styles.gridInner}>
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
                <span className={styles.timeLabel}>
                  {(() => {
                    const d = new Date(meal.occurredAt)
                    return (
                      <>
                        {d.toLocaleDateString('en-US', { weekday: 'short' }) + ' ' + d.getDate()}
                        <br />
                        {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </>
                    )
                  })()}
                </span>
              </div>
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
                <div
                  className={`${styles.overlayTagDot} ${selectedMeal.tag === MEAL_TAG.CLEAN ? styles.overlayTagDotClean : styles.overlayTagDotIndulgent}`}
                />
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
                  <button
                    type="button"
                    aria-label="Edit meal"
                    onClick={() => handleEdit(selectedMeal)}
                    className={styles.overlayEditIconBtn}
                  >
                    <EditIcon />
                  </button>
                </div>
                {selectedMeal.note && <p className={styles.overlayNote}>{selectedMeal.note}</p>}
                {selectedMeal.amountSpent != null && (
                  <p className={styles.overlayAmount}>₹{selectedMeal.amountSpent}</p>
                )}
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

function EditIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}
