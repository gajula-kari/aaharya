import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import DayDetail from './DayDetail'
import type { Meal } from '../types'

vi.mock('../hooks/useMealContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useParams: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

import { useMealContext } from '../hooks/useMealContext'
import { useParams, useNavigate } from 'react-router-dom'

// A fixed past date that is always frozen (older than last month)
const DATE = '2024-06-15'

// A date in the previous month — not frozen, not today
const LAST_MONTH_DATE = (() => {
  const d = new Date()
  const prev = new Date(d.getFullYear(), d.getMonth() - 1, 15)
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}-15`
})()

function mealOnDate(id: string, tag: Meal['tag'] = 'CLEAN'): Meal {
  return {
    id,
    tag,
    imageUrl: null,
    note: null,
    amountSpent: null,
    occurredAt: new Date(2024, 5, 15, 12, 0, 0).getTime(),
  }
}

function mealOffDate(id: string): Meal {
  return {
    id,
    tag: 'CLEAN',
    imageUrl: null,
    note: null,
    amountSpent: null,
    occurredAt: new Date(2024, 5, 14, 12, 0, 0).getTime(),
  }
}

function mockContext(meals: Meal[] = [], loading = false) {
  vi.mocked(useMealContext).mockReturnValue({
    meals,
    loading,
    error: null,
    loadedMonths: new Set(),
    fetchMonth: vi.fn(),
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn(),
  })
}

function renderDayDetail(locationState?: object) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: locationState ?? null }]}>
      <DayDetail />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useParams).mockReturnValue({ date: DATE })
})

describe('DayDetail', () => {
  it('applies highlight ring to the meal matching highlightMealId from location state', () => {
    // JSDOM doesn't implement scrollIntoView — stub it
    window.HTMLElement.prototype.scrollIntoView = vi.fn()
    mockContext([mealOnDate('match-1'), mealOnDate('match-2')])
    renderDayDetail({ highlightMealId: 'match-1' })
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows loading spinner when loading is true', () => {
    mockContext([], true)
    renderDayDetail()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('shows indulgent notice when the day has an indulgent meal', () => {
    mockContext([mealOnDate('m1', 'INDULGENT')])
    renderDayDetail()
    expect(screen.getByText(/one indulgent meal/i)).toBeInTheDocument()
  })

  it('shows "No meals yet today" when no meals on today', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    mockContext([])
    renderDayDetail()
    expect(screen.getByText('No meals yet today')).toBeInTheDocument()
  })

  it('shows "Nothing logged" empty state for past date', () => {
    mockContext([mealOffDate('other')])
    renderDayDetail()
    expect(screen.getByText('Nothing logged')).toBeInTheDocument()
  })

  it('renders only the meals that match the URL date', () => {
    mockContext([mealOnDate('match-1'), mealOnDate('match-2'), mealOffDate('no-match')])
    renderDayDetail()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByText('Nothing logged')).not.toBeInTheDocument()
  })

  it('clicking Add Meal button triggers cameraInputRef click', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    mockContext([])
    renderDayDetail()
    await userEvent.click(screen.getByRole('button', { name: /Add Meal/i }))
  })

  it('shows "Add Meal" button and no "· past" label for today', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    mockContext([])
    renderDayDetail()
    expect(screen.getByRole('button', { name: /Add Meal/ })).toBeInTheDocument()
    expect(screen.queryByText(/· past/)).not.toBeInTheDocument()
  })

  it('navigates to /tag with source gallery when gallery file selected on today', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    mockContext([])
    renderDayDetail()

    await userEvent.click(screen.getByRole('button', { name: 'Choose from gallery' }))

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const galleryInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    await userEvent.upload(galleryInput, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, date: todayStr, source: 'gallery' },
    })
  })

  it('navigates to /tag with source camera when file selected on today', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    mockContext([])
    renderDayDetail()

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, date: todayStr, source: 'camera' },
    })
  })

  it('navigates to /tag with the file and date when a file is selected on a last-month day', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useParams).mockReturnValue({ date: LAST_MONTH_DATE })
    mockContext([])
    renderDayDetail()

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, date: LAST_MONTH_DATE, source: 'gallery' },
    })
  })
})

describe('DayDetail — frozen months', () => {
  it('does not show add buttons for a date older than last month', () => {
    mockContext([]) // DATE = '2024-06-15', always frozen
    renderDayDetail()
    expect(screen.queryByRole('button', { name: /Add Meal/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Add from Photos/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Choose from gallery/i })).not.toBeInTheDocument()
  })

  it('shows "Add from Photos" button for a last-month (non-frozen) day', () => {
    vi.mocked(useParams).mockReturnValue({ date: LAST_MONTH_DATE })
    mockContext([])
    renderDayDetail()
    expect(screen.getByRole('button', { name: /Add from Photos/i })).toBeInTheDocument()
  })
})

describe('DayDetail — fetchMonth on mount', () => {
  it('calls fetchMonth with the year and 0-indexed month of the URL date', () => {
    mockContext([]) // DATE = '2024-06-15'
    renderDayDetail()
    const fetchMonth = vi.mocked(useMealContext).mock.results[0].value.fetchMonth as ReturnType<
      typeof vi.fn
    >
    expect(fetchMonth).toHaveBeenCalledWith(2024, 5) // June 2024 → month index 5
  })
})
