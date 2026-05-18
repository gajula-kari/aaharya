import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import MealsByTag from './MealsByTag'
import type { Meal } from '../types'

vi.mock('../hooks/useMealContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    useLocation: vi.fn(),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

import { useMealContext } from '../hooks/useMealContext'
import { useLocation, useNavigate } from 'react-router-dom'

const now = new Date()

function meal(id: string, tag: Meal['tag'], monthOffset = 0): Meal {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 10, 12, 0, 0)
  return { id, tag, imageUrl: null, note: null, amountSpent: null, occurredAt: d.getTime() }
}

function mockContext(meals: Meal[]) {
  vi.mocked(useMealContext).mockReturnValue({
    meals,
    loading: false,
    error: null,
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
  })
}

function renderPage(initialTab?: string) {
  vi.mocked(useLocation).mockReturnValue({
    state: initialTab ? { initialTab } : null,
    pathname: '/meals',
    search: '',
    hash: '',
    key: 'default',
  })
  return render(
    <MemoryRouter>
      <MealsByTag />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('MealsByTag', () => {
  it('shows empty state when no meals this month', () => {
    mockContext([])
    renderPage()
    expect(screen.getByText(/no.*meals this month/i)).toBeInTheDocument()
  })

  it('shows empty state for clean tab when no clean meals match', () => {
    mockContext([meal('m1', 'INDULGENT')])
    renderPage('CLEAN')
    expect(screen.getByText(/no clean meals this month/i)).toBeInTheDocument()
  })

  it('renders only current-month meals matching the tab', () => {
    mockContext([
      meal('m1', 'CLEAN'),
      meal('m2', 'CLEAN'),
      meal('m3', 'INDULGENT'),
      meal('m4', 'CLEAN', -1),
    ])
    renderPage('CLEAN')
    expect(screen.getAllByText('No image')).toHaveLength(2)
    expect(screen.queryByText(/no clean meals/i)).not.toBeInTheDocument()
  })

  it('renders indulgent meals when initialTab is INDULGENT', () => {
    mockContext([meal('m1', 'INDULGENT'), meal('m2', 'CLEAN')])
    renderPage('INDULGENT')
    expect(screen.getAllByText('No image')).toHaveLength(1)
  })

  it('opens overlay when a meal is clicked', async () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    expect(screen.getByRole('dialog', { name: 'Meal detail' })).toBeInTheDocument()
  })

  it('closes overlay when Close button is clicked', async () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Edit button navigates to /day with highlightMealId', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/day\//), {
      state: { highlightMealId: 'm1' },
    })
  })

  it('closes overlay when backdrop is clicked', async () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    const overlay = screen.getByRole('dialog', { name: 'Meal detail' })
    await userEvent.click(overlay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes overlay when Escape key is pressed', async () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not close overlay on non-Escape keydown', async () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    await userEvent.click(screen.getByText('No image'))
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('MealsByTag — overlay note and amount', () => {
  function mealWithDetails(id: string): Meal {
    const d = new Date(now.getFullYear(), now.getMonth(), 10, 12, 0, 0)
    return {
      id,
      tag: 'CLEAN',
      imageUrl: 'https://example.com/img.jpg',
      note: 'Healthy lunch',
      amountSpent: 150,
      occurredAt: d.getTime(),
    }
  }

  it('shows note in overlay when present', async () => {
    mockContext([mealWithDetails('m1')])
    renderPage()
    await userEvent.click(screen.getByRole('img', { name: 'CLEAN meal' }))
    expect(screen.getByText('Healthy lunch')).toBeInTheDocument()
  })

  it('shows amountSpent in overlay when present', async () => {
    mockContext([mealWithDetails('m1')])
    renderPage()
    await userEvent.click(screen.getByRole('img', { name: 'CLEAN meal' }))
    expect(screen.getByText('₹150')).toBeInTheDocument()
  })
})
