import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ReactNode } from 'react'

interface BottomSheetProps {
  onDismiss: () => void
  overlay?: boolean
  children: ReactNode
}

export default function BottomSheet({ onDismiss, overlay = false, children }: BottomSheetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragStartRef = useRef(0)

  useEffect(() => {
    const raf = requestAnimationFrame(() => setIsVisible(true))
    return () => cancelAnimationFrame(raf)
  }, [])

  function onTouchStart(e: React.TouchEvent) {
    dragStartRef.current = e.touches[0].clientY
    setIsDragging(true)
  }

  function onTouchMove(e: React.TouchEvent) {
    const delta = e.touches[0].clientY - dragStartRef.current
    if (delta < 0) return
    setDragY(delta)
  }

  function onTouchEnd() {
    setIsDragging(false)
    const sheetHeight = sheetRef.current?.offsetHeight ?? 400
    if (dragY > sheetHeight * 0.6) {
      setDragY(sheetHeight + 50)
      setTimeout(onDismiss, 320)
    } else {
      setDragY(0)
    }
  }

  const shell = document.getElementById('app-shell') ?? document.body

  return createPortal(
    <>
      {overlay && <div className="absolute inset-0 z-40 bg-slate/40" onClick={onDismiss} />}
      <div
        className="absolute inset-x-0 bottom-0 z-50"
        style={{
          transform: isVisible ? `translateY(${Math.max(0, dragY)}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div ref={sheetRef} className="rounded-t-2xl bg-surface shadow-2xl">
          <div
            aria-label="Drag to adjust"
            className="flex justify-center pb-2 pt-3"
            style={{ touchAction: 'none' }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="h-1 w-10 rounded-full bg-neem" />
          </div>
          {children}
        </div>
      </div>
    </>,
    shell
  )
}
