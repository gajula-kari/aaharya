import { useEffect, useState } from 'react'
import { MEAL_TAG } from '../types'
import type { Meal } from '../types'

interface MealCardProps {
  meal: Meal
  onTap?: () => void
  onDelete?: (id: string) => Promise<void>
  isConfirming?: boolean
  onConfirmChange?: (open: boolean) => void
}

const styles = {
  article: 'break-inside-avoid mb-2',
  card: 'rounded-2xl overflow-hidden border border-border bg-surface shadow-sm',
  imageWrapper: 'relative cursor-pointer',
  image: 'w-full object-cover aspect-square',
  noImage: 'aspect-square bg-fog flex items-center justify-center text-text-muted text-xs',
  imageOverlay:
    'absolute inset-0 bg-gradient-to-t from-slate/30 to-transparent pointer-events-none',
  tagDotClean: 'absolute top-2 left-2 h-4 w-4 rounded-full bg-moss ring-1 ring-surface shadow-sm',
  tagDotIndulgent:
    'absolute top-2 left-2 h-4 w-4 rounded-full bg-indulgent ring-1 ring-surface shadow-sm',
  timeLabel: 'absolute bottom-2 left-2 text-[10px] text-surface/90 font-medium',
  deleteButton:
    'absolute bottom-2 right-2 p-1.5 rounded-full bg-slate/70 text-fog shadow-sm transition hover:bg-overlimit',
  confirmOverlay:
    'absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-fog/95 p-3',
  confirmText: 'text-center text-xs font-semibold text-slate',
  confirmActions: 'flex gap-2',
  confirmYes: 'rounded-full bg-overlimit px-3 py-1.5 text-[10px] font-semibold text-surface',
  confirmCancel: 'rounded-full border border-border px-3 py-1.5 text-[10px] text-text-secondary',
  meta: 'px-3 py-2.5',
  note: 'text-xs leading-relaxed text-text-secondary',
  amount: 'mt-0.5 text-xs text-text-muted',
  lightbox: 'fixed inset-0 z-50 flex items-center justify-center bg-slate/80 p-4',
  lightboxImage: 'max-h-[90vh] max-w-full rounded-2xl object-contain',
}

export default function MealCard({
  meal,
  onTap,
  onDelete,
  isConfirming,
  onConfirmChange,
}: MealCardProps) {
  const [localConfirm, setLocalConfirm] = useState(false)
  const confirmDelete = isConfirming ?? localConfirm
  function setConfirmDelete(open: boolean) {
    if (onConfirmChange) onConfirmChange(open)
    else setLocalConfirm(open)
  }
  const [deleting, setDeleting] = useState(false)
  const [lightbox, setLightbox] = useState(false)

  const timeLabel = new Date(meal.occurredAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  useEffect(() => {
    if (!lightbox) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  async function handleDelete() {
    setDeleting(true)
    try {
      await onDelete?.(meal.id)
    } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  return (
    <article className={styles.article}>
      <div className={styles.card}>
        <div
          className={styles.imageWrapper}
          onClick={() => {
            if (onTap) onTap()
            else if (meal.imageUrl) setLightbox(true)
          }}
        >
          {meal.imageUrl ? (
            <img src={meal.imageUrl} alt={`${meal.tag} meal`} className={styles.image} />
          ) : (
            <div className={styles.noImage}>No image</div>
          )}

          <div className={styles.imageOverlay} />

          {!confirmDelete && (
            <div
              className={meal.tag === MEAL_TAG.CLEAN ? styles.tagDotClean : styles.tagDotIndulgent}
            />
          )}

          {!confirmDelete && <span className={styles.timeLabel}>{timeLabel}</span>}

          {onDelete && !confirmDelete && (
            <button
              type="button"
              aria-label="Delete meal"
              className={styles.deleteButton}
              onClick={(e) => {
                e.stopPropagation()
                setConfirmDelete(true)
              }}
            >
              <TrashIcon />
            </button>
          )}

          {confirmDelete && (
            <div className={styles.confirmOverlay} onClick={(e) => e.stopPropagation()}>
              <p className={styles.confirmText}>Delete this meal?</p>
              <div className={styles.confirmActions}>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className={styles.confirmYes}
                >
                  {deleting ? '…' : 'Yes, delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className={styles.confirmCancel}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {(meal.note || meal.amountSpent != null) && (
          <div className={styles.meta}>
            {meal.note && <p className={styles.note}>{meal.note}</p>}
            {meal.amountSpent != null && <p className={styles.amount}>₹{meal.amountSpent}</p>}
          </div>
        )}
      </div>

      {lightbox && meal.imageUrl && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Meal image"
          className={styles.lightbox}
          onClick={() => setLightbox(false)}
        >
          <img
            src={meal.imageUrl}
            alt={`${meal.tag} meal`}
            className={styles.lightboxImage}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </article>
  )
}

function TrashIcon() {
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
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}
