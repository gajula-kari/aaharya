import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Calendar from './Calendar'
import type { Meal } from '../types'

vi.mock('../hooks/useMealContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  }
})

import { useMealContext } from '../hooks/useMealContext'
import { useNavigate } from 'react-router-dom'

function mealOn(year: number, month: number, day: number, tag: Meal['tag'] = 'CLEAN'): Meal {
  return {
    id: `${year}-${month}-${day}-${tag}`,
    tag,
    imageUrl: null,
    amountSpent: null,
    note: null,
    occurredAt: new Date(year, month - 1, day, 12, 0, 0, 0).getTime(),
  }
}

function renderCalendar(meals: Meal[] = []) {
  vi.mocked(useMealContext).mockReturnValue({
    meals,
    loading: false,
    error: null,
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
  })
  return render(
    <MemoryRouter>
      <Calendar />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Calendar', () => {
  it('renders the current month name and year', () => {
    renderCalendar()
    const today = new Date()
    const monthName = today.toLocaleString('default', { month: 'long' })
    expect(screen.getByText(new RegExp(monthName))).toBeInTheDocument()
    expect(screen.getByText(new RegExp(String(today.getFullYear())))).toBeInTheDocument()
  })

  it('renders a button for each day of the current month', () => {
    renderCalendar()
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    const dayButtons = screen
      .getAllByRole('button')
      .filter((btn) => /^\d+$/.test(btn.querySelector('span')?.textContent ?? ''))
    expect(dayButtons).toHaveLength(daysInMonth)
  })

  it("today's button is enabled", () => {
    renderCalendar()
    const today = new Date()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).not.toBeDisabled()
  })

  it('a future day button is disabled', () => {
    const today = new Date()
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
    if (today.getDate() === daysInMonth) return
    renderCalendar()
    const btn = screen.getByRole('button', { name: String(today.getDate() + 1) })
    expect(btn).toBeDisabled()
  })

  it('applies emerald class when latest meal is CLEAN', () => {
    const today = new Date()
    renderCalendar([mealOn(today.getFullYear(), today.getMonth() + 1, today.getDate(), 'CLEAN')])
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-emerald-100'
    )
  })

  it('applies amber class when latest meal is INDULGENT', () => {
    const today = new Date()
    renderCalendar([
      mealOn(today.getFullYear(), today.getMonth() + 1, today.getDate(), 'INDULGENT'),
    ])
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-amber-100'
    )
  })

  it('applies slate class when no meals are logged today', () => {
    renderCalendar([])
    const today = new Date()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-slate-100'
    )
  })

  it('uses the latest meal tag when multiple meals exist on the same day', () => {
    const today = new Date()
    const y = today.getFullYear()
    const mo = today.getMonth() + 1
    const d = today.getDate()
    const earlier: Meal = {
      id: 'a',
      tag: 'CLEAN',
      imageUrl: null,
      amountSpent: null,
      note: null,
      occurredAt: new Date(y, mo - 1, d, 10, 0).getTime(),
    }
    const later: Meal = {
      id: 'b',
      tag: 'INDULGENT',
      imageUrl: null,
      amountSpent: null,
      note: null,
      occurredAt: new Date(y, mo - 1, d, 14, 0).getTime(),
    }
    renderCalendar([earlier, later])
    expect(screen.getByRole('button', { name: String(d) })).toHaveClass('bg-amber-100')
  })

  it("clicking today's button navigates to /day/YYYY-MM-DD", async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderCalendar()

    const today = new Date()
    await userEvent.click(screen.getByRole('button', { name: String(today.getDate()) }))

    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    expect(navigate).toHaveBeenCalledWith(`/day/${y}-${m}-${d}`)
  })

  it('renders the Home link', () => {
    renderCalendar()
    expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument()
  })
})
