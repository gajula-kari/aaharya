import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import type { Meal, MealContextValue } from '../types'
import { ERROR_MESSAGES } from '../constants/errors'

vi.mock('../hooks/useMealContext')
vi.mock('../hooks/useSettingsContext')
vi.mock('../hooks/useInstallContext')
vi.mock('../services/mealApi', () => ({
  fetchEarliestMonth: vi.fn().mockResolvedValue(null),
}))
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

import { useMealContext } from '../hooks/useMealContext'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { useNavigate } from 'react-router-dom'
import { useInstallContext } from '../hooks/useInstallContext'
import * as mealApi from '../services/mealApi'

// ─── helpers ────────────────────────────────────────────────────────────────

function mockMealContext(overrides: Partial<MealContextValue> = {}) {
  vi.mocked(useMealContext).mockReturnValue({
    meals: [],
    loading: false,
    error: null,
    loadedMonths: new Set(),
    fetchMonth: vi.fn().mockResolvedValue(undefined),
    addMeal: vi.fn(),
    updateMeal: vi.fn(),
    deleteMeal: vi.fn(),
    refetch: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  })
}

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

// ─── setup ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue(null)
  vi.mocked(useSettingsContext).mockReturnValue({
    settings: null,
    settingsLoading: false,
    saveSettings: vi.fn(),
  })
  vi.mocked(useInstallContext).mockReturnValue({
    canInstall: false,
    dismissed: false,
    dismissedAt: null,
    install: vi.fn(),
    dismiss: vi.fn(),
  })
  mockMealContext()
})

// ─── loading and error states ────────────────────────────────────────────────

describe('loading and error states', () => {
  it('shows the error message when loading fails', () => {
    mockMealContext({ error: 'Failed to load' })
    renderHome()
    expect(screen.getByText(ERROR_MESSAGES.LOAD_MEALS_FAILED)).toBeInTheDocument()
  })
})

// ─── calendar grid ────────────────────────────────────────────────────────────

describe('calendar grid', () => {
  const today = new Date()

  function mealToday(tag: Meal['tag']): Meal {
    return {
      id: tag,
      tag,
      imageUrl: null,
      amountSpent: null,
      note: null,
      occurredAt: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
        12,
        0,
        0
      ).getTime(),
    }
  }

  it('applies emerald class to today when the latest meal is HOME', () => {
    mockMealContext({ meals: [mealToday('CLEAN')] })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-clean')
  })

  it('applies amber class to today when the meal is OUTSIDE and no goal is set', () => {
    mockMealContext({ meals: [mealToday('INDULGENT')] })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-indulgent'
    )
  })

  it('applies amber class to today when there are both CLEAN and INDULGENT meals', () => {
    mockMealContext({ meals: [mealToday('CLEAN'), mealToday('INDULGENT')] })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-indulgent'
    )
  })

  it('applies amber class when all meals today are OUTSIDE and no goal is set', () => {
    mockMealContext({ meals: [mealToday('INDULGENT'), mealToday('INDULGENT')] })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-indulgent'
    )
  })

  it('applies rose class when the outside day falls beyond the goal cutoff', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 0 },
      settingsLoading: false,
      saveSettings: vi.fn(),
    })
    mockMealContext({ meals: [mealToday('INDULGENT')] })
    renderHome()
    expect(await screen.findByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-overlimit'
    )
  })

  it('applies emerald class when all meals today are HOME', () => {
    mockMealContext({ meals: [mealToday('CLEAN'), mealToday('CLEAN')] })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-clean')
  })

  it('applies slate class to today when no meals are logged', () => {
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-surface')
  })

  it("clicking today's day button navigates to /day/YYYY-MM-DD", async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderHome()

    await userEvent.click(screen.getByRole('button', { name: String(today.getDate()) }))

    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    expect(navigate).toHaveBeenCalledWith(`/day/${y}-${m}-${d}`)
  })
})

// ─── stats card ───────────────────────────────────────────────────────────────

describe('stats card', () => {
  const today = new Date()
  const year = today.getFullYear()
  const month = today.getMonth()

  function mealThisMonth(tag: Meal['tag'], dayOffset = 0): Meal {
    return {
      id: `${tag}-${dayOffset}`,
      tag,
      imageUrl: null,
      amountSpent: null,
      note: null,
      occurredAt: new Date(year, month, 1 + dayOffset, 12, 0, 0).getTime(),
    }
  }

  it('shows Clean days and Indulgent days labels', () => {
    renderHome()
    expect(screen.getByText('clean days')).toBeInTheDocument()
    expect(screen.getByText('indulgent days')).toBeInTheDocument()
  })

  it('counts a day with only CLEAN meals as a clean day', () => {
    mockMealContext({ meals: [mealThisMonth('CLEAN', 0), mealThisMonth('CLEAN', 0)] })
    renderHome()
    expect(screen.getByText('clean days').previousSibling?.textContent).toBe('1')
  })

  it('counts a day with CLEAN + INDULGENT meals as an indulgent day', () => {
    mockMealContext({ meals: [mealThisMonth('CLEAN', 0), mealThisMonth('INDULGENT', 0)] })
    renderHome()
    expect(screen.getByText('indulgent days').previousSibling?.textContent).toBe('1')
    expect(screen.getByText('clean days').previousSibling?.textContent).toBe('0')
  })

  it('does not show a limit message when indulgent total is within the limit', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 5 },
      settingsLoading: false,
      saveSettings: vi.fn(),
    })
    mockMealContext({ meals: [mealThisMonth('INDULGENT', 0)] })
    renderHome()

    await screen.findByText('indulgent days')
    expect(screen.queryByText(/reached your limit|over your limit/)).not.toBeInTheDocument()
  })

  it('does not show a limit message when no limit is set', () => {
    mockMealContext({
      meals: [
        mealThisMonth('INDULGENT', 0),
        mealThisMonth('INDULGENT', 1),
        mealThisMonth('INDULGENT', 2),
      ],
    })
    renderHome()
    expect(screen.queryByText(/reached your limit|over your limit/)).not.toBeInTheDocument()
  })

  it('shows the limit progress bar when exactly at the limit', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 1 },
      settingsLoading: false,
      saveSettings: vi.fn(),
    })
    mockMealContext({ meals: [mealThisMonth('INDULGENT', 0)] })
    renderHome()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('clicking View all navigates to /meals with year and month state', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    mockMealContext({ meals: [mealThisMonth('CLEAN', 0), mealThisMonth('CLEAN', 1)] })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'View all' }))
    expect(navigate).toHaveBeenCalledWith('/meals', {
      state: { year: today.getFullYear(), month: today.getMonth() },
    })
  })

  it('hides View all when fewer than 2 distinct days logged this month', () => {
    mockMealContext({ meals: [mealThisMonth('CLEAN', 0)] })
    renderHome()
    expect(screen.queryByRole('button', { name: 'View all' })).not.toBeInTheDocument()
  })

  it('shows the indulgent rule bottom sheet when indulgent day is first logged', () => {
    localStorage.removeItem('aaharya_seen_indulgent_rule')
    mockMealContext({ meals: [mealThisMonth('INDULGENT', 0)] })
    renderHome()
    expect(screen.getByText(/one indulgent meal marks the whole day/i)).toBeInTheDocument()
  })

  it('dismisses the bottom sheet when "Got it" is clicked', async () => {
    localStorage.removeItem('aaharya_seen_indulgent_rule')
    mockMealContext({ meals: [mealThisMonth('INDULGENT', 0)] })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByText(/one indulgent meal marks the whole day/i)).not.toBeInTheDocument()
  })
})

// ─── month navigation ─────────────────────────────────────────────────────────

describe('month navigation', () => {
  // Pin today to 2026-05-15 so month headings are predictable.
  // Use { toFake: ['Date'] } to keep timer functions real (waitFor needs them).
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-05-15'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the current month heading on initial render', () => {
    renderHome()
    expect(screen.getByRole('heading', { name: 'May 2026' })).toBeInTheDocument()
  })

  it('→ is not rendered at the current month', () => {
    renderHome()
    expect(screen.queryByRole('button', { name: 'Next month' })).not.toBeInTheDocument()
  })

  it('← is not rendered while earliestMonth is loading', () => {
    // fetchEarliestMonth never resolves during this test (pending)
    vi.mocked(mealApi.fetchEarliestMonth).mockReturnValue(new Promise(() => {}))
    renderHome()
    expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument()
  })

  it('← is not rendered when there is no backward history (null earliestMonth)', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue(null)
    renderHome()
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument()
    )
  })

  it('← is rendered when earliestMonth is before current month', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-03')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
  })

  it('clicking ← shows the previous month heading', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: 'April 2026' })).toBeInTheDocument()
  })

  it('clicking → from a past month returns to current month', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByRole('heading', { name: 'April 2026' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: 'May 2026' })).toBeInTheDocument()
  })

  it('← is not rendered when already at the backward limit', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-04')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    // Now at April 2026 which is the limit → ← hidden
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Previous month' })).not.toBeInTheDocument()
    )
  })

  it('FAB is visible on the current month', () => {
    renderHome()
    // AddMealFAB renders a file input
    expect(document.querySelector('input[type="file"]')).toBeInTheDocument()
  })

  it('FAB is hidden when on a past month', async () => {
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(document.querySelector('input[type="file"]')).not.toBeInTheDocument()
  })

  it('calls fetchMonth when navigating to a month not yet loaded', async () => {
    const fetchMonth = vi.fn().mockResolvedValue(undefined)
    mockMealContext({ fetchMonth })
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    // month=3 (April, 0-indexed)
    expect(fetchMonth).toHaveBeenCalledWith(2026, 3)
  })

  it('stats show 0 clean days when past month has no meals', async () => {
    // Boot loads current month meals but April has none
    const today = new Date()
    mockMealContext({
      meals: [
        {
          id: 'may-1',
          tag: 'CLEAN',
          imageUrl: null,
          amountSpent: null,
          note: null,
          occurredAt: new Date(today.getFullYear(), today.getMonth(), 10).getTime(),
        },
      ],
    })
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.getByText('clean days').previousSibling?.textContent).toBe('0')
  })

  it('indulgent rule sheet is not shown on past months', async () => {
    localStorage.removeItem('aaharya_seen_indulgent_rule')
    const today = new Date()
    // Meal is in April (past month)
    mockMealContext({
      meals: [
        {
          id: 'apr-1',
          tag: 'INDULGENT',
          imageUrl: null,
          amountSpent: null,
          note: null,
          occurredAt: new Date(today.getFullYear(), today.getMonth() - 1, 10).getTime(),
        },
      ],
    })
    vi.mocked(mealApi.fetchEarliestMonth).mockResolvedValue('2026-01')
    renderHome()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Previous month' })).toBeInTheDocument()
    )
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(screen.queryByText(/one indulgent meal marks the whole day/i)).not.toBeInTheDocument()
  })
})

// ─── install banner ───────────────────────────────────────────────────────────

describe('install banner', () => {
  function withMeals(count = 3) {
    mockMealContext({
      meals: Array.from({ length: count }, (_, i) => ({
        id: String(i),
        tag: 'CLEAN' as const,
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: Date.now(),
      })),
    })
  }

  it('does not show the banner when canInstall is false', () => {
    withMeals()
    renderHome()
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })

  it('does not show the banner when fewer than 3 meals are logged', () => {
    withMeals(2)
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: false,
      dismissedAt: null,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderHome()
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })

  it('shows the banner when canInstall is true and not dismissed', () => {
    withMeals()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: false,
      dismissedAt: null,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderHome()
    expect(screen.getByText('Install App')).toBeInTheDocument()
  })

  it('calls install when the Install button is clicked', async () => {
    withMeals()
    const install = vi.fn()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: false,
      dismissedAt: null,
      install,
      dismiss: vi.fn(),
    })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Install' }))
    expect(install).toHaveBeenCalled()
  })

  it('calls dismiss when the close button is clicked', async () => {
    withMeals()
    const dismiss = vi.fn()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: false,
      dismissedAt: null,
      install: vi.fn(),
      dismiss,
    })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(dismiss).toHaveBeenCalled()
  })

  it('fires the drop-in animation after the splash delay and cleans up on unmount', () => {
    localStorage.removeItem('aaharya_install_banner_animated')
    withMeals()
    vi.useFakeTimers()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: false,
      dismissedAt: null,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    const { unmount } = renderHome()
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    unmount()
    vi.useRealTimers()
  })

  it('re-shows banner after 15 days', () => {
    const sixteenDaysAgo = Date.now() - 16 * 86400000
    withMeals()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: true,
      dismissedAt: sixteenDaysAgo,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderHome()
    expect(screen.getByText('Install App')).toBeInTheDocument()
  })

  it('does not re-show banner if fewer than 15 days have passed since dismissal', () => {
    const tenDaysAgo = Date.now() - 10 * 86400000
    withMeals()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: true,
      dismissedAt: tenDaysAgo,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderHome()
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
  })
})

// ─── FAB file input ───────────────────────────────────────────────────────────

describe('FAB button click', () => {
  it('does not navigate when no file is selected', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderHome()

    const cameraInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(cameraInput, { target: { files: [] } })
    fireEvent.change(cameraInput, { target: { files: null } })

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('FAB file input', () => {
  it('navigates to /tag with source camera when a file is chosen via camera', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderHome()

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const cameraInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await userEvent.upload(cameraInput, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, source: 'camera' },
    })
  })

  it('navigates to /tag with source gallery when a file is chosen via gallery', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderHome()

    await userEvent.click(screen.getByRole('button', { name: 'Choose from gallery' }))

    const file = new File(['img'], 'meal.jpg', { type: 'image/jpeg' })
    const galleryInput = document.querySelectorAll('input[type="file"]')[1] as HTMLInputElement
    await userEvent.upload(galleryInput, file)

    expect(navigate).toHaveBeenCalledWith('/tag', {
      state: { image: file, source: 'gallery' },
    })
  })
})
