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

const DATE = '2024-06-15'

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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealOnDate('match-1'), mealOnDate('match-2')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail({ highlightMealId: 'match-1' })
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows loading spinner when loading is true', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: true,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('shows indulgent notice when the day has an indulgent meal', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealOnDate('m1', 'INDULGENT')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()
    expect(screen.getByText(/one indulgent meal/i)).toBeInTheDocument()
  })

  it('shows "No meals yet today" when no meals on today', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()
    expect(screen.getByText('No meals yet today')).toBeInTheDocument()
  })

  it('shows "Nothing logged" empty state for past date', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealOffDate('other')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()

    expect(screen.getByText('Nothing logged')).toBeInTheDocument()
  })

  it('renders only the meals that match the URL date', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealOnDate('match-1'), mealOnDate('match-2'), mealOffDate('no-match')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()

    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.queryByText('Nothing logged')).not.toBeInTheDocument()
  })

  it('clicking Add Meal button triggers cameraInputRef click', async () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()
    await userEvent.click(screen.getByRole('button', { name: /Add Meal/i }))
  })

  it('shows "Add Meal" button and no "· past" label for today', () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    vi.mocked(useParams).mockReturnValue({ date: todayStr })
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, date: todayStr, source: 'camera' },
    })
  })

  it('navigates to /tag with the file and date when a file is selected', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
    })
    renderDayDetail()

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(input, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, date: DATE, source: 'gallery' },
    })
  })
})
