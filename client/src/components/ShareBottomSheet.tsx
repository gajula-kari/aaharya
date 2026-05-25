import { useRef, useState, useEffect } from 'react'
import domtoimage from 'dom-to-image-more'
import ShareCard from './ShareCard'
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
  shareButton:
    'w-full rounded-full bg-moss py-3 text-sm font-semibold text-surface transition hover:bg-moss/90',
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

  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)

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

    try {
      const blob = await domtoimage.toBlob(shareCardRef.current, {
        width: 480,
      })

      const monthName = new Date(year, month)
        .toLocaleString('default', { month: 'long' })
        .toLowerCase()
      const filename = `aaharya-${monthName}-${year}.png`
      const file = new File([blob], filename, { type: 'image/png' })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
        })
      }

      onClose()
    } catch {
      onClose()
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className={styles.backdrop} onClick={onClose} />

      {/* ShareCard for dom-to-image capture */}
      <div ref={shareCardRef}>
        <ShareCard meals={meals} monthlyGoal={monthlyGoal} month={month} year={year} />
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
                <ShareCard meals={meals} monthlyGoal={monthlyGoal} month={month} year={year} />
              </div>
            </div>

            {/* Share button */}
            <button type="button" onClick={handleShare} className={styles.shareButton}>
              Share
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
