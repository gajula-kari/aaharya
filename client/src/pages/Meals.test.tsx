import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Meals from './Meals'
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

function meal(id: string, tag: Meal['tag'], monthOffset = 0, note?: string): Meal {
  const d = new Date(now.getFullYear(), now.getMonth() + monthOffset, 10, 12, 0, 0)
  return {
    id,
    tag,
    imageUrl: null,
    note: note ?? null,
    amountSpent: null,
    occurredAt: d.getTime(),
  }
}

function mockContext(meals: Meal[], loading = false) {
  vi.mocked(useMealContext).mockReturnValue({
    meals,
    loading,
    error: null,
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn(),
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
      <Meals />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('Meals — empty states', () => {
  it('shows empty state when no meals this month', () => {
    mockContext([])
    renderPage()
    expect(screen.getByText('No meals this month')).toBeInTheDocument()
  })

  it('does not show tabs when no meals', () => {
    mockContext([])
    renderPage()
    expect(screen.queryByRole('button', { name: 'All' })).not.toBeInTheDocument()
  })

  it('shows empty state for clean tab when no clean meals', () => {
    mockContext([meal('m1', 'INDULGENT')])
    renderPage('CLEAN')
    expect(screen.getByText('No clean meals yet')).toBeInTheDocument()
  })

  it('shows empty state for indulgent tab when no indulgent meals', () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage('INDULGENT')
    expect(screen.getByText('No indulgent meals yet')).toBeInTheDocument()
  })
})

describe('Meals — list view (< 3 meals)', () => {
  it('list view renders without grid cells (no "No image" text)', () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    // list view uses an empty div for the thumbnail — no "No image" text
    expect(screen.queryByText('No image')).not.toBeInTheDocument()
  })

  it('shows note in list item when present', () => {
    mockContext([meal('m1', 'CLEAN', 0, 'Great salad')])
    renderPage()
    expect(screen.getByText('Great salad')).toBeInTheDocument()
  })

  it('shows tabs when meals exist in list view', () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
  })
})

describe('Meals — grid view (3+ meals)', () => {
  it('renders "No image" placeholder for each grid cell', () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    expect(screen.getAllByText('No image')).toHaveLength(3)
  })
})

describe('Meals — tabs', () => {
  it('shows tabs when meals exist', () => {
    mockContext([meal('m1', 'CLEAN')])
    renderPage()
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clean' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Indulgent' })).toBeInTheDocument()
  })

  it('switching to Indulgent tab with 3 meals shows only 1 indulgent cell', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    // all 3 → grid view
    expect(screen.getAllByText('No image')).toHaveLength(3)
    await userEvent.click(screen.getByRole('button', { name: 'Indulgent' }))
    // 1 indulgent → list view (no "No image" text in list)
    expect(screen.queryByText('No image')).not.toBeInTheDocument()
  })

  it('switching to Clean tab with 4 clean meals stays in grid', async () => {
    mockContext([
      meal('m1', 'CLEAN'),
      meal('m2', 'CLEAN'),
      meal('m3', 'CLEAN'),
      meal('m4', 'INDULGENT'),
    ])
    renderPage()
    await userEvent.click(screen.getByRole('button', { name: 'Clean' }))
    expect(screen.getAllByText('No image')).toHaveLength(3)
  })

  it('switching to All tab shows all current-month meals', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage('CLEAN')
    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getAllByText('No image')).toHaveLength(3)
  })
})

describe('Meals — overlay', () => {
  it('opens overlay when a grid meal is clicked', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    expect(screen.getByRole('dialog', { name: 'Meal detail' })).toBeInTheDocument()
  })

  it('closes overlay when Close button is clicked', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes overlay when Escape key is pressed', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Edit button in overlay navigates to /day with highlightMealId', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    await userEvent.click(screen.getByRole('button', { name: 'Edit meal' }))
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/day\//), {
      state: { highlightMealId: expect.any(String) },
    })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows note in overlay when present', async () => {
    mockContext([meal('m1', 'CLEAN', 0, 'Tasty!'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    expect(screen.getByText('Tasty!')).toBeInTheDocument()
  })

  it('closes overlay when backdrop is clicked', async () => {
    mockContext([meal('m1', 'CLEAN'), meal('m2', 'CLEAN'), meal('m3', 'INDULGENT')])
    renderPage()
    await userEvent.click(screen.getAllByText('No image')[0])
    const overlay = screen.getByRole('dialog', { name: 'Meal detail' })
    await userEvent.click(overlay)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})

describe('Meals — meal with imageUrl', () => {
  function mealWithImage(id: string, tag: Meal['tag']): Meal {
    return {
      id,
      tag,
      imageUrl: 'https://example.com/img.jpg',
      note: 'Delicious',
      amountSpent: 250,
      occurredAt: new Date(now.getFullYear(), now.getMonth(), 10, 12, 0, 0).getTime(),
    }
  }

  it('renders image in grid view when imageUrl is set', () => {
    mockContext([
      mealWithImage('m1', 'CLEAN'),
      mealWithImage('m2', 'CLEAN'),
      mealWithImage('m3', 'INDULGENT'),
    ])
    renderPage()
    const images = screen.getAllByRole('img', { name: /meal/i })
    expect(images.length).toBeGreaterThan(0)
  })

  it('shows note and amount in overlay', async () => {
    mockContext([
      mealWithImage('m1', 'CLEAN'),
      mealWithImage('m2', 'CLEAN'),
      mealWithImage('m3', 'INDULGENT'),
    ])
    renderPage()
    const imgs = screen.getAllByRole('img', { name: /CLEAN meal|INDULGENT meal/i })
    await userEvent.click(imgs[0])
    expect(screen.getByText('Delicious')).toBeInTheDocument()
    expect(screen.getByText('₹250')).toBeInTheDocument()
  })
})

describe('Meals — loading', () => {
  it('shows spinner while loading', () => {
    mockContext([], true)
    renderPage()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })
})

describe('Meals — excludes past-month meals', () => {
  it('does not show meals from previous months', () => {
    mockContext([meal('past', 'CLEAN', -1)])
    renderPage()
    expect(screen.getByText('No meals this month')).toBeInTheDocument()
  })
})
