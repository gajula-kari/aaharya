import { useCallback, useEffect, useMemo, useState } from 'react'
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

const TAG_OPTIONS: MealTag[] = [MEAL_TAG.CLEAN, MEAL_TAG.INDULGENT]

// ─── Component ───────────────────────────────────────────────────────────────

export default function TagMeal() {
  const state = useLocation().state as TagMealLocationState | null
  const {
    existingMeal,
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
    selectedTime,
    setSelectedTime,
    timeSource,
    setTimeSource,
    showTimePicker,
    setShowTimePicker,
    dateLabel,
    handleSave,
    handleCancel,
  } = useTagMeal(state)

  if (!imageFile && !existingMeal) return <Navigate to="/" replace />

  return (
    <div>
      <h1>{existingMeal ? 'Edit Meal' : 'Tag Meal'}</h1>

      <div>
        {preview ? (
          <img src={preview} alt="Meal" />
        ) : (
          <div>
            <Spinner />
          </div>
        )}
      </div>

      <p>{dateLabel}</p>

      {!existingMeal && (
        <div>
          {showTimePicker ? (
            <input
              type="time"
              value={selectedTime ?? ''}
              autoFocus
              onChange={(e) => {
                setSelectedTime(e.target.value || null)
                setTimeSource('manual')
                setShowTimePicker(false)
              }}
              onBlur={() => setShowTimePicker(false)}
            />
          ) : selectedTime ? (
            <button type="button" onClick={() => setShowTimePicker(true)}>
              {formatTimeDisplay(selectedTime)}
              {timeSource === 'auto' && <span>· tap to edit</span>}
            </button>
          ) : (
            <button type="button" onClick={() => setShowTimePicker(true)}>
              + Add time (optional)
            </button>
          )}
        </div>
      )}

      {saveError && <p>{saveError}</p>}

      <div>
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            disabled={saving || !preview}
            onClick={() => setSelectedTag(tag)}
          >
            {tag === MEAL_TAG.CLEAN ? '✓ Clean' : '⚠ Indulgent'}
          </button>
        ))}
      </div>

      {selectedTag !== MEAL_TAG.CLEAN && (
        <input
          type="number"
          placeholder="Amount spent (optional)"
          value={amountSpent}
          onChange={(e) => setAmountSpent(e.target.value)}
        />
      )}

      <textarea
        placeholder="Note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
      />

      <button type="button" disabled={saving || !preview} onClick={handleSave}>
        {saving ? (
          <span>
            <Spinner size="sm" /> Saving
          </span>
        ) : (
          'Save'
        )}
      </button>

      <button type="button" onClick={handleCancel}>
        Cancel
      </button>
    </div>
  )
}

// ─── Hook ────────────────────────────────────────────────────────────────────

function useTagMeal(state: TagMealLocationState | null) {
  const { addMeal, updateMeal } = useMealContext()
  const navigate = useNavigate()

  // Input data from navigation state
  const imageFile = state?.image
  const dateFromState = state?.date
  const existingMeal = state?.meal
  const source = state?.source

  // Form state
  const [selectedTag, setSelectedTag] = useState<MealTag>(existingMeal?.tag ?? MEAL_TAG.CLEAN)
  const [note, setNote] = useState(existingMeal?.note ?? '')
  const [amountSpent, setAmountSpent] = useState<number | string>(existingMeal?.amountSpent ?? '')

  const timePicker = useTimePicker(source, imageFile, existingMeal)
  const { selectedTime } = timePicker

  // Internal/lifecycle
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

  const handleSave = useCallback(async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const trimmedNote = note.trim() || null
      const parsedAmount =
        selectedTag === MEAL_TAG.CLEAN ? null : amountSpent !== '' ? Number(amountSpent) : null

      if (existingMeal) {
        await updateMeal(existingMeal.id, {
          tag: selectedTag,
          note: trimmedNote,
          amountSpent: parsedAmount,
        })
      } else {
        if (!imageFile || !preview) return
        await addMeal({
          image: imageFile,
          tag: selectedTag,
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
  }, [
    saving,
    note,
    selectedTag,
    amountSpent,
    existingMeal,
    imageFile,
    preview,
    occurredAt,
    updateMeal,
    addMeal,
    navigate,
    backTarget,
  ])

  const handleCancel = useCallback(() => {
    navigate(backTarget, { replace: true })
  }, [navigate, backTarget])

  return {
    existingMeal,
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
    ...timePicker,
    dateLabel,
    handleSave,
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
