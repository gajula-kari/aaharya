import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import exifr from 'exifr'
import { useMealContext } from '../hooks/useMealContext'
import Spinner from '../components/Spinner'
import { MEAL_TAG } from '../types'
import type { Meal, MealTag } from '../types'
import { formatDateLabel, formatLocalDate, formatTimeDisplay } from '../utils/date'

interface TagMealLocationState {
  image?: File
  date?: string
  meal?: Meal
  source?: 'camera' | 'gallery'
}

const styles = {
  root: 'fixed inset-0 z-40',
  // Photo fills entire background
  photo: 'absolute inset-0 h-full w-full object-cover',
  photoSpinner: 'absolute inset-0 flex items-center justify-center bg-slate',
  photoGradient:
    'pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate/60 to-transparent',
  retakeButton:
    'absolute right-4 top-10 rounded-full bg-slate/60 px-4 py-2 text-xs font-semibold text-fog backdrop-blur-sm transition hover:bg-slate/80',
  // Dismiss area sits above the sheet, below the retake button
  dismissArea: 'absolute inset-x-0 top-0 cursor-pointer',
  // Sheet anchored to bottom
  sheetWrap: 'absolute inset-x-0 bottom-0',
  // Sheet
  sheet: 'rounded-t-2xl bg-surface shadow-2xl',
  handleArea: 'flex justify-center pt-3 pb-2',
  handleBar: 'h-1 w-10 rounded-full bg-neem',
  sheetBody: 'flex flex-col gap-4 px-4 pb-8 pt-1',
  question: 'text-center text-sm font-medium text-text-muted',
  // Date + time row
  metaRow: 'flex items-center justify-between',
  dateLabel: 'text-xs text-text-muted',
  timeButton: 'text-xs text-text-secondary transition hover:text-slate',
  timeHint: 'text-xs text-text-disabled',
  timeInput:
    'rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-slate focus:border-moss focus:outline-none',
  // Tag cards
  tagRow: 'grid grid-cols-2 gap-3',
  tagCardBase: 'flex flex-col items-center gap-2 rounded-xl border-2 py-5 transition',
  tagCardCleanOn: 'border-moss bg-moss text-fog',
  tagCardCleanOff: 'border-border bg-surface text-text-muted',
  tagCardIndulgentOn: 'border-indulgent bg-indulgent text-surface',
  tagCardIndulgentOff: 'border-border bg-surface text-text-muted',
  tagLabel: 'text-sm font-semibold',
  // Fields
  input:
    'w-full rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-disabled focus:border-moss focus:outline-none',
  textarea:
    'w-full resize-none rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-disabled focus:border-moss focus:outline-none',
  // Save
  saveButton:
    'w-full rounded-full bg-slate py-3 text-sm font-semibold text-fog transition disabled:opacity-40',
  saveSpinner: 'flex items-center justify-center gap-2',
  errorText: 'text-center text-xs text-indulgent',
  savingOverlay: 'absolute inset-0 z-50 flex items-center justify-center bg-slate/50',
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function TagMeal() {
  const state = useLocation().state as TagMealLocationState | null
  const {
    existingMeal,
    source,
    imageFile,
    setImageFile,
    preview,
    saving,
    saveError,
    selectedTag,
    setSelectedTag,
    note,
    setNote,
    amountSpent,
    setAmountSpent,
    selectedTime,
    setSelectedTime,
    timeSource,
    setTimeSource,
    showTimePicker,
    setShowTimePicker,
    dateLabel,
    handleSave,
    handleSaveWithTag,
    handleCancel,
  } = useTagMeal(state)

  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const dragStartRef = useRef(0)

  const PEEK_HEIGHT = 44
  const [isVisible, setIsVisible] = useState(false)
  const [isPeeking, setIsPeeking] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  if (!imageFile && !existingMeal) return <Navigate to="/" replace />

  const isClean = selectedTag === MEAL_TAG.CLEAN
  const isIndulgent = selectedTag === MEAL_TAG.INDULGENT
  const showSaveButton = !!existingMeal || isIndulgent

  function sheetTransform(): string {
    if (!isVisible) return 'translateY(100%)'
    if (isPeeking) return `translateY(calc(100% - ${PEEK_HEIGHT}px + ${dragY}px))`
    return `translateY(${Math.max(0, dragY)}px)`
  }

  function onHandleTouchStart(e: React.TouchEvent) {
    dragStartRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - dragStartRef.current
    if (!isPeeking && delta < 0) return
    setDragY(delta)
  }

  function onHandleTouchEnd() {
    setIsDragging(false)
    if (!isPeeking) {
      if (dragY > 80) setIsPeeking(true)
    } else {
      if (dragY < -60) setIsPeeking(false)
    }
    setDragY(0)
  }

  function handleRetake() {
    if (source === 'camera') cameraRef.current?.click()
    else galleryRef.current?.click()
  }

  function handleNewPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setImageFile(file)
    e.target.value = ''
  }

  function handleDismiss() {
    if (existingMeal) handleCancel()
    else handleRetake()
  }

  async function handleTagSelect(tag: MealTag) {
    setSelectedTag(tag)
    if (!existingMeal && tag === MEAL_TAG.CLEAN) {
      await handleSaveWithTag(MEAL_TAG.CLEAN)
    }
  }

  return (
    <div className={styles.root}>
      {/* Hidden file inputs for retake/change */}
      {!existingMeal && (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleNewPhoto}
          />
          <input
            ref={galleryRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleNewPhoto}
          />
        </>
      )}

      {/* Photo — absolute background */}
      {preview ? (
        <img src={preview} alt="Meal" className={styles.photo} />
      ) : (
        <div className={styles.photoSpinner}>
          <Spinner />
        </div>
      )}
      <div className={styles.photoGradient} />

      {/* Retake / Change button */}
      {!existingMeal && source && (
        <button type="button" onClick={handleRetake} className={styles.retakeButton}>
          {source === 'camera' ? 'Retake' : 'Change'}
        </button>
      )}

      {/* Transparent dismiss area above the sheet */}
      <div
        className={styles.dismissArea}
        style={{ bottom: 'var(--sheet-height, 50%)' }}
        onClick={handleDismiss}
      />

      {/* Bottom sheet */}
      <div
        className={styles.sheetWrap}
        style={{
          transform: sheetTransform(),
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div className={styles.sheet}>
          <div
            aria-label="Drag to adjust"
            className={styles.handleArea}
            style={{ touchAction: 'none' }}
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
          >
            <div className={styles.handleBar} />
          </div>

          <div className={styles.sheetBody}>
            <p className={styles.question}>
              {existingMeal ? 'Edit meal tag' : 'How was this meal?'}
            </p>

            {/* Date + time */}
            <div className={styles.metaRow}>
              <span className={styles.dateLabel}>{dateLabel}</span>

              {!existingMeal && (
                <>
                  {showTimePicker ? (
                    <input
                      type="time"
                      value={selectedTime ?? ''}
                      autoFocus
                      className={styles.timeInput}
                      onChange={(e) => {
                        setSelectedTime(e.target.value || null)
                        setTimeSource('manual')
                        setShowTimePicker(false)
                      }}
                      onBlur={() => setShowTimePicker(false)}
                    />
                  ) : selectedTime ? (
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className={styles.timeButton}
                    >
                      {formatTimeDisplay(selectedTime)}
                      {timeSource === 'auto' && (
                        <span className={styles.timeHint}> · tap to edit</span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowTimePicker(true)}
                      className={styles.timeButton}
                    >
                      + Add time
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Tag selection */}
            <div className={styles.tagRow}>
              <button
                type="button"
                disabled={saving || !preview}
                onClick={() => handleTagSelect(MEAL_TAG.CLEAN)}
                className={`${styles.tagCardBase} ${isClean ? styles.tagCardCleanOn : styles.tagCardCleanOff}`}
              >
                <LeafIcon selected={isClean} />
                <span className={styles.tagLabel}>Clean</span>
              </button>
              <button
                type="button"
                disabled={saving || !preview}
                onClick={() => handleTagSelect(MEAL_TAG.INDULGENT)}
                className={`${styles.tagCardBase} ${isIndulgent ? styles.tagCardIndulgentOn : styles.tagCardIndulgentOff}`}
              >
                <FlameIcon selected={isIndulgent} />
                <span className={styles.tagLabel}>Indulgent</span>
              </button>
            </div>

            {isIndulgent && (
              <>
                <input
                  type="number"
                  placeholder="Amount spent"
                  value={amountSpent}
                  onChange={(e) => setAmountSpent(e.target.value)}
                  className={styles.input}
                />
                <textarea
                  placeholder="Add a note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className={styles.textarea}
                />
              </>
            )}

            {saveError && <p className={styles.errorText}>{saveError}</p>}

            {showSaveButton && (
              <button
                type="button"
                disabled={saving || !preview}
                onClick={handleSave}
                className={styles.saveButton}
              >
                {saving ? (
                  <span className={styles.saveSpinner}>
                    <Spinner size="sm" /> Saving…
                  </span>
                ) : existingMeal ? (
                  'Save Changes'
                ) : (
                  'Save Meal'
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Full-screen saving overlay */}
      {saving && (
        <div className={styles.savingOverlay}>
          <Spinner size="lg" className="text-fog" />
        </div>
      )}
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function LeafIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={selected ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  )
}

function FlameIcon({ selected }: { selected: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={selected ? 2.5 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

function useTagMeal(state: TagMealLocationState | null) {
  const { addMeal, updateMeal } = useMealContext()
  const navigate = useNavigate()

  const [imageFile, setImageFile] = useState<File | undefined>(state?.image)
  const dateFromState = state?.date
  const existingMeal = state?.meal
  const source = state?.source

  const [selectedTag, setSelectedTag] = useState<MealTag | null>(existingMeal?.tag ?? null)
  const [note, setNote] = useState(existingMeal?.note ?? '')
  const [amountSpent, setAmountSpent] = useState<number | string>(existingMeal?.amountSpent ?? '')

  const timePicker = useTimePicker(source, imageFile, existingMeal)
  const { selectedTime } = timePicker

  const [preview, setPreview] = useState<string | null>(existingMeal?.imageUrl ?? null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [mountedAt] = useState(() => Date.now())

  const { occurredAt, dateLabel } = useMemo(() => {
    if (existingMeal) {
      const d = new Date(existingMeal.occurredAt)
      return { occurredAt: existingMeal.occurredAt, dateLabel: formatDateLabel(d, true) }
    }

    const base = dateFromState
      ? (() => {
          const [y, m, d] = dateFromState.split('-').map(Number)
          return new Date(y, m - 1, d)
        })()
      : new Date(mountedAt)

    const dateLabel = formatDateLabel(base, false)

    if (selectedTime) {
      const [hh, mm] = selectedTime.split(':').map(Number)
      const d = new Date(base)
      d.setHours(hh, mm, 0, 0)
      return { occurredAt: d.getTime(), dateLabel }
    }

    if (source === 'camera') {
      const mounted = new Date(mountedAt)
      const d = new Date(base)
      d.setHours(mounted.getHours(), mounted.getMinutes(), mounted.getSeconds(), 0)
      return { occurredAt: d.getTime(), dateLabel }
    }

    const noon = new Date(base)
    noon.setHours(12, 0, 0, 0)
    return { occurredAt: noon.getTime(), dateLabel }
  }, [existingMeal, dateFromState, mountedAt, selectedTime, source])

  useEffect(() => {
    if (existingMeal?.imageUrl) return
    if (!imageFile) return
    let cancelled = false
    const reader = new FileReader()
    reader.onload = () => {
      if (!cancelled) setPreview(reader.result as string)
    }
    reader.readAsDataURL(imageFile)
    return () => {
      cancelled = true
    }
  }, [imageFile, existingMeal])

  const backTarget = useMemo(() => {
    if (existingMeal) return `/day/${formatLocalDate(new Date(existingMeal.occurredAt))}`
    if (dateFromState) return `/day/${dateFromState}`
    return '/'
  }, [existingMeal, dateFromState])

  const save = useCallback(
    async (tagToSave: MealTag) => {
      if (saving) return
      setSaving(true)
      setSaveError(null)
      try {
        const trimmedNote = note.trim() || null
        const parsedAmount = amountSpent !== '' ? Number(amountSpent) : null

        if (existingMeal) {
          await updateMeal(existingMeal.id, {
            tag: tagToSave,
            note: trimmedNote,
            amountSpent: parsedAmount,
          })
        } else {
          if (!imageFile || !preview) return
          await addMeal({
            image: imageFile,
            tag: tagToSave,
            occurredAt: occurredAt ?? Date.now(),
            note: trimmedNote,
            amountSpent: parsedAmount,
          })
        }
        navigate(backTarget, { replace: true })
      } catch (err) {
        setSaveError(err instanceof Error ? err.message : 'Unknown error')
        setSaving(false)
      }
    },
    [
      saving,
      note,
      amountSpent,
      existingMeal,
      imageFile,
      preview,
      occurredAt,
      updateMeal,
      addMeal,
      navigate,
      backTarget,
    ]
  )

  const handleSave = useCallback(() => {
    if (selectedTag) save(selectedTag)
  }, [save, selectedTag])
  const handleSaveWithTag = useCallback((tag: MealTag) => save(tag), [save])
  const handleCancel = useCallback(() => navigate(-1), [navigate])

  return {
    existingMeal,
    source,
    imageFile,
    preview,
    saving,
    saveError,
    selectedTag,
    setSelectedTag,
    note,
    setNote,
    amountSpent,
    setAmountSpent,
    setImageFile,
    ...timePicker,
    dateLabel,
    handleSave,
    handleSaveWithTag,
    handleCancel,
  }
}

// ─── Time picker hook ─────────────────────────────────────────────────────────

function useTimePicker(
  source: string | undefined,
  imageFile: File | undefined,
  existingMeal: Meal | undefined
) {
  const [selectedTime, setSelectedTime] = useState<string | null>(() => {
    if (source !== 'camera' || existingMeal) return null
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  })
  const [timeSource, setTimeSource] = useState<'auto' | 'manual' | null>(() =>
    source === 'camera' && !existingMeal ? 'auto' : null
  )
  const [showTimePicker, setShowTimePicker] = useState(false)

  useEffect(() => {
    if (source !== 'gallery' || !imageFile || existingMeal) return
    let cancelled = false
    exifr
      .parse(imageFile, ['DateTimeOriginal'])
      .then((data) => {
        if (cancelled) return
        const exifDate = data?.DateTimeOriginal
        if (exifDate instanceof Date && !isNaN(exifDate.getTime())) {
          const hh = String(exifDate.getHours()).padStart(2, '0')
          const mm = String(exifDate.getMinutes()).padStart(2, '0')
          setSelectedTime(`${hh}:${mm}`)
          setTimeSource('auto')
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [source, imageFile, existingMeal])

  return {
    selectedTime,
    setSelectedTime,
    timeSource,
    setTimeSource,
    showTimePicker,
    setShowTimePicker,
  }
}
