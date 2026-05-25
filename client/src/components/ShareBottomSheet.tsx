import { useRef, useState, useEffect } from 'react'
import domtoimage from 'dom-to-image-more'
import ShareCard from './ShareCard'
import Spinner from './Spinner'
import type { Meal } from '../types'

interface ShareBottomSheetProps {
  meals: Meal[]
  monthlyGoal: number | null
  month: number // 0-indexed
  year: number
  onClose: () => void
}

const styles = {
  backdrop: 'fixed inset-0 z-40 bg-slate/40',
  sheetWrap:
    'fixed bottom-0 left-1/2 z-50 w-full max-w-[480px] -translate-x-1/2 rounded-t-2xl bg-surface shadow-2xl',
  handleArea: 'flex justify-center pt-3 pb-2',
  handleBar: 'h-1 w-10 rounded-full bg-neem',
  sheetBody: 'flex flex-col gap-4 px-4 pb-8 pt-1',
  previewWrapper: 'flex justify-center',
  previewCard: 'origin-top',
  label: 'text-sm font-medium text-slate',
  input:
    'w-full rounded-xl border border-border bg-fog px-4 py-3 text-sm text-slate placeholder:text-text-disabled focus:border-moss focus:outline-none',
  buttonRow: 'flex gap-3',
  shareButton:
    'flex-1 rounded-full bg-moss py-3 text-sm font-semibold text-surface transition hover:bg-moss/90 disabled:opacity-50',
  downloadButton:
    'flex-1 rounded-full border border-border bg-surface py-3 text-sm font-semibold text-moss transition hover:bg-fog disabled:opacity-50',
  spinnerContainer: 'flex items-center justify-center gap-2',
  errorText: 'text-xs text-overlimit',
}

export default function ShareBottomSheet({
  meals,
  monthlyGoal,
  month,
  year,
  onClose,
}: ShareBottomSheetProps) {
  const shareCardRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  const [userMessage, setUserMessage] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Entry animation
  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function sheetTransform(): string {
    if (!isVisible) return 'translateY(100%)'
    return `translateY(${Math.max(0, dragY)}px)`
  }

  function onHandleTouchStart(e: React.TouchEvent) {
    dragStartRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function onHandleTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - dragStartRef.current
    if (delta < 0) return
    setDragY(delta)
  }

  function onHandleTouchEnd() {
    setIsDragging(false)
    const sheetHeight = sheetRef.current?.offsetHeight ?? 400
    if (dragY > sheetHeight * 0.6) {
      // animate fully off-screen then close
      setDragY(sheetHeight + 50)
      setTimeout(onClose, 320)
    } else {
      setDragY(0)
    }
  }

  async function handleShare() {
    if (!shareCardRef.current) return
    setIsGenerating(true)
    setError(null)

    try {
      const blob = await domtoimage.toBlob(shareCardRef.current, {
        width: 480,
      })

      const monthName = new Date(year, month)
        .toLocaleString('default', { month: 'long' })
        .toLowerCase()
      const filename = `aaharya-${monthName}-${year}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      // Try Web Share API
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        })
      } else {
        // Fallback to download
        downloadFile(blob, filename)
      }

      onClose()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to share'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  function handleDownload() {
    if (!shareCardRef.current) return
    setIsGenerating(true)
    setError(null)

    try {
      domtoimage.toBlob(shareCardRef.current, { width: 480 }).then((blob) => {
        const monthName = new Date(year, month)
          .toLocaleString('default', { month: 'long' })
          .toLowerCase()
        const filename = `aaharya-${monthName}-${year}.png`
        downloadFile(blob, filename)
        onClose()
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to download'
      setError(message)
    } finally {
      setIsGenerating(false)
    }
  }

  function downloadFile(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* ShareCard off-screen for dom-to-image capture */}
      <div ref={shareCardRef}>
        <ShareCard
          meals={meals}
          monthlyGoal={monthlyGoal}
          month={month}
          year={year}
          userMessage={userMessage || undefined}
        />
      </div>

      {/* Bottom Sheet */}
      <div
        className={styles.sheetWrap}
        style={{
          transform: sheetTransform(),
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div ref={sheetRef} className="rounded-t-2xl bg-surface">
          {/* Drag handle */}
          <div
            className={styles.handleArea}
            style={{ touchAction: 'none' }}
            onTouchStart={onHandleTouchStart}
            onTouchMove={onHandleTouchMove}
            onTouchEnd={onHandleTouchEnd}
            aria-label="Drag to adjust"
          >
            <div className={styles.handleBar} />
          </div>

          {/* Sheet body */}
          <div className={styles.sheetBody}>
            {/* Preview */}
            <div className={styles.previewWrapper}>
              <div
                className={styles.previewCard}
                style={{
                  transform: 'scale(0.5)',
                }}
              >
                <ShareCard
                  meals={meals}
                  monthlyGoal={monthlyGoal}
                  month={month}
                  year={year}
                  userMessage={userMessage || undefined}
                />
              </div>
            </div>

            {/* Message input */}
            <div>
              <label className={styles.label}>Add a message (optional)</label>
              <input
                type="text"
                maxLength={80}
                placeholder="Proud of this one 💪"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                className={styles.input}
              />
              {userMessage.length > 0 && (
                <p className="mt-1 text-xs text-text-muted">{userMessage.length}/80</p>
              )}
            </div>

            {/* Error message */}
            {error && <p className={styles.errorText}>{error}</p>}

            {/* Share and Download buttons */}
            <div className={styles.buttonRow}>
              <button
                type="button"
                onClick={handleShare}
                disabled={isGenerating}
                className={styles.shareButton}
              >
                {isGenerating ? (
                  <span className={styles.spinnerContainer}>
                    <Spinner size="sm" /> Generating...
                  </span>
                ) : (
                  'Share'
                )}
              </button>
              <button
                type="button"
                onClick={handleDownload}
                disabled={isGenerating}
                className={styles.downloadButton}
              >
                {isGenerating ? 'Generating...' : 'Download'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
