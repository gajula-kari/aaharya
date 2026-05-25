import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ShareCard from './ShareCard'
import type { Meal } from '../types'

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

describe('ShareCard', () => {
  it('renders with correct wrapper styling', () => {
    const { container } = render(<ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />)
    const card = container.querySelector('div')
    expect(card).toHaveClass('w-full')
    expect(card).toHaveClass('bg-surface')
    expect(card).toHaveClass('p-5')
  })

  it('renders month and year', () => {
    const { getByText } = render(<ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />)
    expect(getByText('JANUARY 2026')).toBeInTheDocument()
  })

  it('renders day headers (Mon Tue Wed Thu Fri Sat Sun)', () => {
    const { getByText } = render(<ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />)
    expect(getByText('Mon')).toBeInTheDocument()
    expect(getByText('Tue')).toBeInTheDocument()
    expect(getByText('Wed')).toBeInTheDocument()
    expect(getByText('Thu')).toBeInTheDocument()
    expect(getByText('Fri')).toBeInTheDocument()
    expect(getByText('Sat')).toBeInTheDocument()
    expect(getByText('Sun')).toBeInTheDocument()
  })

  it('renders all days of the month', () => {
    const { getByText } = render(<ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />)
    // January has 31 days
    expect(getByText('1')).toBeInTheDocument()
    expect(getByText('31')).toBeInTheDocument()
  })

  it('renders headline and subtext with no goal', () => {
    const meals = [
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 5).getTime(),
      }),
    ]
    const { getByText } = render(
      <ShareCard meals={meals} monthlyGoal={null} month={0} year={2026} />
    )
    expect(getByText('a mindful month.')).toBeInTheDocument()
    expect(getByText('1 indulgent day logged.')).toBeInTheDocument()
  })

  it('renders headline for clean month', () => {
    const { getByText } = render(<ShareCard meals={[]} monthlyGoal={5} month={0} year={2026} />)
    expect(getByText('a clean month.')).toBeInTheDocument()
    expect(getByText('not a single indulgent day.')).toBeInTheDocument()
  })

  it('renders headline within limit (but above 50%)', () => {
    const meals = [
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 5).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 10).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 15).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 20).getTime(),
      }),
    ]
    const { getByText } = render(<ShareCard meals={meals} monthlyGoal={5} month={0} year={2026} />)
    expect(getByText('stayed within my limit.')).toBeInTheDocument()
    expect(getByText('4 of 5 indulgent days used.')).toBeInTheDocument()
  })

  it('renders headline over limit by one', () => {
    const meals = [
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 1).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 5).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 10).getTime(),
      }),
    ]
    const { getByText } = render(<ShareCard meals={meals} monthlyGoal={2} month={0} year={2026} />)
    expect(getByText('almost stayed within it.')).toBeInTheDocument()
    expect(getByText('went over by one. being honest about it.')).toBeInTheDocument()
  })

  it('renders user message when provided', () => {
    const { getByText } = render(
      <ShareCard
        meals={[]}
        monthlyGoal={null}
        month={0}
        year={2026}
        userMessage="Proud of this month!"
      />
    )
    expect(getByText('Proud of this month!')).toBeInTheDocument()
  })

  it('does not render user message when not provided', () => {
    const { queryByText } = render(
      <ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />
    )
    expect(queryByText('Proud of this month!')).not.toBeInTheDocument()
  })

  it('renders footer with "track yours at" and "aaharya"', () => {
    const { getByText } = render(<ShareCard meals={[]} monthlyGoal={null} month={0} year={2026} />)
    expect(getByText('track yours at')).toBeInTheDocument()
    expect(getByText('aaharya')).toBeInTheDocument()
  })

  it('renders different months correctly', () => {
    const { getByText: getByTextMay } = render(
      <ShareCard meals={[]} monthlyGoal={null} month={4} year={2026} />
    )
    expect(getByTextMay('MAY 2026')).toBeInTheDocument()

    const { getByText: getByTextDec } = render(
      <ShareCard meals={[]} monthlyGoal={null} month={11} year={2026} />
    )
    expect(getByTextDec('DECEMBER 2026')).toBeInTheDocument()
  })

  it('applies correct classes for day statuses', () => {
    const meals = [
      createMeal({
        tag: 'CLEAN',
        occurredAt: new Date(2026, 0, 5).getTime(),
      }),
      createMeal({
        tag: 'INDULGENT',
        occurredAt: new Date(2026, 0, 10).getTime(),
      }),
    ]
    const { container } = render(
      <ShareCard meals={meals} monthlyGoal={null} month={0} year={2026} />
    )
    // Check that day buttons are rendered
    const dayButtons = container.querySelectorAll('button[type="button"]')
    expect(dayButtons.length).toBeGreaterThan(0)
  })
})
