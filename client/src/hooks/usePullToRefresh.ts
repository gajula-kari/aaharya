import { useEffect, useRef, useState } from 'react'

const PULL_THRESHOLD = 64
const MAX_PULL = 96

function getScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el.parentElement
  while (node && node !== document.body) {
    const { overflowY } = window.getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const touchStartY = useRef(0)
  const isPulling = useRef(false)
  const pullDistanceRef = useRef(0)
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    function onTouchStart(e: TouchEvent) {
      const scrollParent = getScrollParent(el!)
      if (!scrollParent || scrollParent.scrollTop > 0) return
      touchStartY.current = e.touches[0].clientY
      isPulling.current = true
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPulling.current) return
      const delta = e.touches[0].clientY - touchStartY.current
      if (delta <= 0) {
        if (pullDistanceRef.current > 0) {
          pullDistanceRef.current = 0
          setPullDistance(0)
        }
        return
      }
      const clamped = Math.min(delta * 0.45, MAX_PULL)
      pullDistanceRef.current = clamped
      setPullDistance(clamped)
      if (delta > 8) e.preventDefault()
    }

    function onTouchEnd() {
      if (!isPulling.current) return
      isPulling.current = false
      const d = pullDistanceRef.current
      pullDistanceRef.current = 0
      setPullDistance(0)
      if (d >= PULL_THRESHOLD) {
        setIsRefreshing(true)
        onRefreshRef.current().finally(() => setIsRefreshing(false))
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  return { containerRef, pullDistance, isRefreshing }
}
