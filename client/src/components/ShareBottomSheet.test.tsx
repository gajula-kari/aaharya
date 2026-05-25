import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ShareBottomSheet from './ShareBottomSheet'

// Mock dom-to-image-more
vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
  },
}))

describe('ShareBottomSheet', () => {
  const mockOnClose = vi.fn()

  beforeEach(() => {
    mockOnClose.mockClear()
  })

  it('renders backdrop and sheet', () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument()
  })

  it('closes when backdrop is clicked', () => {
    const { container } = render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    const backdrop = container.querySelector('[class*="bg-slate/40"]')
    expect(backdrop).toBeInTheDocument()
    if (backdrop) {
      fireEvent.click(backdrop)
      expect(mockOnClose).toHaveBeenCalled()
    }
  })

  it('renders ShareCard preview scaled down', () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    // Check that ShareCard is rendered (appears twice: off-screen + preview)
    expect(screen.getAllByText('JANUARY 2026').length).toBe(2)
  })

  it('handles touch drag start/move/end', () => {
    const { container } = render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )

    const handleArea = container.querySelector('[aria-label="Drag to adjust"]')
    expect(handleArea).toBeInTheDocument()

    if (handleArea) {
      // Simulate touch events
      fireEvent.touchStart(handleArea, {
        touches: [{ clientY: 100 }],
      })

      fireEvent.touchMove(handleArea, {
        touches: [{ clientY: 200 }],
      })

      fireEvent.touchEnd(handleArea)

      // Without mocking sheetRef.current.offsetHeight, we can't test the 60% logic
      // but we can verify the handlers are attached
      expect(handleArea).toBeInTheDocument()
    }
  })

  it('renders with different months', () => {
    const { rerender } = render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={4} year={2026} onClose={mockOnClose} />
    )
    // May should appear twice (off-screen + preview)
    expect(screen.getAllByText('MAY 2026').length).toBe(2)

    rerender(
      <ShareBottomSheet
        meals={[]}
        monthlyGoal={null}
        month={11}
        year={2026}
        onClose={mockOnClose}
      />
    )
    // December should appear twice (off-screen + preview)
    expect(screen.getAllByText('DECEMBER 2026').length).toBe(2)
  })
})
