import { render, screen, act, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Home from './Home'
import type { Meal } from '../types'

vi.mock('../hooks/useMealContext')
vi.mock('../hooks/useSettingsContext')
vi.mock('../hooks/useInstallContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

import { useMealContext } from '../hooks/useMealContext'
import { useSettingsContext } from '../hooks/useSettingsContext'
import { useNavigate } from 'react-router-dom'
import { useInstallContext } from '../hooks/useInstallContext'

function renderHome() {
  return render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
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
})

describe('loading and error states', () => {
  it('shows the error message when loading fails', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: 'Failed to load',
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    expect(screen.getByText(/Failed to load/)).toBeInTheDocument()
  })
})

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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('CLEAN')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-clean')
  })

  it('applies amber class to today when the meal is OUTSIDE and no goal is set', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('INDULGENT')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-indulgent'
    )
  })

  it('applies amber class to today when there are both CLEAN and INDULGENT meals', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('CLEAN'), mealToday('INDULGENT')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-indulgent'
    )
  })

  it('applies amber class when all meals today are OUTSIDE and no goal is set', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('INDULGENT'), mealToday('INDULGENT')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('INDULGENT')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    expect(await screen.findByRole('button', { name: String(today.getDate()) })).toHaveClass(
      'bg-overlimit'
    )
  })

  it('applies emerald class when all meals today are HOME', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealToday('CLEAN'), mealToday('CLEAN')],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-clean')
  })

  it('applies slate class to today when no meals are logged', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByRole('button', { name: String(today.getDate()) })).toHaveClass('bg-surface')
  })

  it("clicking today's day button navigates to /day/YYYY-MM-DD", async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    await userEvent.click(screen.getByRole('button', { name: String(today.getDate()) }))

    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    expect(navigate).toHaveBeenCalledWith(`/day/${y}-${m}-${d}`)
  })
})

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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    expect(screen.getByText('clean days')).toBeInTheDocument()
    expect(screen.getByText('indulgent days')).toBeInTheDocument()
  })

  it('counts a day with only CLEAN meals as a clean day', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('CLEAN', 0), mealThisMonth('CLEAN', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    expect(screen.getByText('clean days').previousSibling?.textContent).toBe('1')
  })

  it('counts a day with CLEAN + INDULGENT meals as an indulgent day', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('CLEAN', 0), mealThisMonth('INDULGENT', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('INDULGENT', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    await screen.findByText('indulgent days')
    expect(screen.queryByText(/reached your limit|over your limit/)).not.toBeInTheDocument()
  })

  it('does not show a limit message when no limit is set', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [
        mealThisMonth('INDULGENT', 0),
        mealThisMonth('INDULGENT', 1),
        mealThisMonth('INDULGENT', 2),
      ],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('INDULGENT', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('clicking View all navigates to /meals', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('CLEAN', 0), mealThisMonth('CLEAN', 1)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'View all' }))
    expect(navigate).toHaveBeenCalledWith('/meals')
  })

  it('hides View all when fewer than 2 distinct days logged this month', () => {
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('CLEAN', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.queryByRole('button', { name: 'View all' })).not.toBeInTheDocument()
  })

  it('shows the indulgent rule bottom sheet when indulgent day is first logged', () => {
    localStorage.removeItem('aaharya_seen_indulgent_rule')
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('INDULGENT', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    expect(screen.getByText(/one indulgent meal marks the whole day/i)).toBeInTheDocument()
  })

  it('dismisses the bottom sheet when "Got it" is clicked', async () => {
    localStorage.removeItem('aaharya_seen_indulgent_rule')
    vi.mocked(useMealContext).mockReturnValue({
      meals: [mealThisMonth('INDULGENT', 0)],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()
    await userEvent.click(screen.getByRole('button', { name: 'Got it' }))
    expect(screen.queryByText(/one indulgent meal marks the whole day/i)).not.toBeInTheDocument()
  })
})

describe('install banner', () => {
  function withMeals(count = 3) {
    vi.mocked(useMealContext).mockReturnValue({
      meals: Array.from({ length: count }, (_, i) => ({
        id: String(i),
        tag: 'CLEAN' as const,
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: Date.now(),
      })),
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
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

  it('re-shows banner after 15 days if user has logged a recent meal', () => {
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

  it('does not re-show banner if user has no meals in the last 15 days', () => {
    const sixteenDaysAgo = Date.now() - 16 * 86400000
    vi.mocked(useMealContext).mockReturnValue({
      meals: Array.from({ length: 3 }, (_, i) => ({
        id: String(i),
        tag: 'CLEAN' as const,
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: Date.now() - 20 * 86400000,
      })),
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      dismissed: true,
      dismissedAt: sixteenDaysAgo,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderHome()
    expect(screen.queryByText('Install App')).not.toBeInTheDocument()
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

describe('FAB button click', () => {
  it('does not navigate when no file is selected', () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
    renderHome()

    const cameraInput = document.querySelector('input[type="file"]') as HTMLInputElement
    // Empty FileList (files truthy but [0] returns undefined)
    fireEvent.change(cameraInput, { target: { files: [] } })
    // Null files (optional chain short-circuits)
    fireEvent.change(cameraInput, { target: { files: null } })

    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('FAB file input', () => {
  it('navigates to /tag with source camera when a file is chosen via camera', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
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
    vi.mocked(useMealContext).mockReturnValue({
      meals: [],
      loading: false,
      error: null,
      addMeal: vi.fn(),
      updateMeal: vi.fn(),
      deleteMeal: vi.fn(),
      refetch: vi.fn(),
    })
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
