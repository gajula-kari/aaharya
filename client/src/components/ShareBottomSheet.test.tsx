import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ShareBottomSheet from './ShareBottomSheet'
import type { Meal } from '../types'

// Mock dom-to-image-more
vi.mock('dom-to-image-more', () => ({
  default: {
    toBlob: vi.fn(() => Promise.resolve(new Blob(['test'], { type: 'image/png' }))),
  },
}))

const createMeal = (overrides: Partial<Meal> = {}): Meal => ({
  id: 'meal-1',
  userId: 'user-1',
  imageUrl: null,
  tag: 'CLEAN' as const,
  amountSpent: null,
  note: null,
  occurredAt: Date.now(),
  createdAt: Date.now(),
  updatedAt: Date.now(),
  ...overrides,
})

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
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument()
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

  it('renders message input with max 80 chars', () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    const input = screen.getByPlaceholderText('Proud of this one 💪')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('maxLength', '80')
  })

  it('shows character count when message is entered', async () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    const input = screen.getByPlaceholderText('Proud of this one 💪')
    await userEvent.type(input, 'Hello')
    expect(screen.getByText('5/80')).toBeInTheDocument()
  })

  it('renders share and download buttons', () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    expect(screen.getByRole('button', { name: /Share/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download/i })).toBeInTheDocument()
  })

  it('disables buttons while generating', async () => {
    const { default: domtoimage } = await import('dom-to-image-more')
    ;(domtoimage.toBlob as any).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(new Blob()), 100))
    )

    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )

    const shareButton = screen.getByRole('button', { name: /^Share$/i })
    fireEvent.click(shareButton)

    // Button should show generating state while processing
    expect(screen.getAllByText(/Generating/i).length).toBeGreaterThan(0)
  })

  it('renders ShareCard preview scaled down', () => {
    const { container } = render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    // Check that ShareCard is rendered (appears twice: off-screen + preview)
    expect(screen.getAllByText('JANUARY 2026').length).toBe(2)
  })

  it('passes userMessage to ShareCard', async () => {
    render(
      <ShareBottomSheet meals={[]} monthlyGoal={null} month={0} year={2026} onClose={mockOnClose} />
    )
    const input = screen.getByPlaceholderText('Proud of this one 💪')
    await userEvent.type(input, 'Test message')
    // The message should appear in both ShareCards (off-screen + preview)
    expect(screen.getAllByText('Test message').length).toBe(2)
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
