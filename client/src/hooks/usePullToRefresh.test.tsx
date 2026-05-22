import { render, screen, act, waitFor } from '@testing-library/react'
import { usePullToRefresh } from './usePullToRefresh'

// jsdom does not ship TouchEvent — provide a minimal stand-in
if (!('TouchEvent' in window)) {
  class MockTouchEvent extends Event {
    touches: unknown[]
    changedTouches: unknown[]
    constructor(type: string, init: Record<string, unknown> = {}) {
      super(type, { bubbles: true, cancelable: true })
      this.touches = (init.touches as unknown[]) ?? []
      this.changedTouches = (init.changedTouches as unknown[]) ?? []
    }
  }
  Object.defineProperty(window, 'TouchEvent', { value: MockTouchEvent, writable: true })
}

function makePoint(clientY: number) {
  return { identifier: 1, clientX: 0, clientY, target: document.body } as unknown as Touch
}

function dispatchTouch(el: Element, type: string, clientY: number) {
  const point = makePoint(clientY)
  const event = new TouchEvent(type, {
    touches: type === 'touchend' ? [] : [point],
    changedTouches: [point],
    bubbles: true,
    cancelable: true,
  } as TouchEventInit)
  act(() => {
    el.dispatchEvent(event)
  })
}

function TestComponent({ onRefresh }: { onRefresh: () => Promise<void> }) {
  const { containerRef, pullDistance, isRefreshing } = usePullToRefresh(onRefresh)
  return (
    <div style={{ overflowY: 'auto' }} data-testid="scroll-parent">
      <div ref={containerRef} data-testid="container">
        <span data-testid="pull-distance">{pullDistance}</span>
        <span data-testid="is-refreshing">{String(isRefreshing)}</span>
      </div>
    </div>
  )
}

describe('usePullToRefresh', () => {
  it('calls onRefresh when pulled past the threshold', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 200) // 200 * 0.45 = 90 > 64 threshold
    dispatchTouch(container, 'touchend', 200)

    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1))
  })

  it('does not call onRefresh when pull is below the threshold', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 50) // 50 * 0.45 = 22.5 < 64
    dispatchTouch(container, 'touchend', 50)

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('updates pullDistance as the user drags down', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 100)

    const dist = Number(screen.getByTestId('pull-distance').textContent)
    expect(dist).toBeGreaterThan(0)
    expect(dist).toBeLessThanOrEqual(96) // capped at MAX_PULL
  })

  it('resets pullDistance to 0 when released below threshold', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 50)
    dispatchTouch(container, 'touchend', 50)

    expect(screen.getByTestId('pull-distance').textContent).toBe('0')
  })

  it('shows isRefreshing while onRefresh is in flight then clears it', async () => {
    let resolveRefresh!: () => void
    const onRefresh = vi.fn().mockReturnValue(new Promise<void>((r) => (resolveRefresh = r)))
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 200)
    dispatchTouch(container, 'touchend', 200)

    await waitFor(() => expect(screen.getByTestId('is-refreshing').textContent).toBe('true'))
    await act(async () => {
      resolveRefresh()
    })
    expect(screen.getByTestId('is-refreshing').textContent).toBe('false')
  })

  it('does not activate when the scroll parent is scrolled down', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const scrollParent = screen.getByTestId('scroll-parent')
    const container = screen.getByTestId('container')

    Object.defineProperty(scrollParent, 'scrollTop', {
      value: 50,
      configurable: true,
      writable: true,
    })

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 200)
    dispatchTouch(container, 'touchend', 200)

    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('ignores upward swipes', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)
    render(<TestComponent onRefresh={onRefresh} />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 200)
    dispatchTouch(container, 'touchmove', 0) // negative delta
    dispatchTouch(container, 'touchend', 0)

    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.getByTestId('pull-distance').textContent).toBe('0')
  })

  it('does not activate when no scrollable parent is found', () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined)

    function NoScrollParent() {
      const { containerRef } = usePullToRefresh(onRefresh)
      return (
        <div data-testid="plain-parent">
          <div ref={containerRef} data-testid="container" />
        </div>
      )
    }

    render(<NoScrollParent />)
    const container = screen.getByTestId('container')

    dispatchTouch(container, 'touchstart', 0)
    dispatchTouch(container, 'touchmove', 200)
    dispatchTouch(container, 'touchend', 200)

    expect(onRefresh).not.toHaveBeenCalled()
  })
})
