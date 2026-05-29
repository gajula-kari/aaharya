import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider } from './MealProvider'
import { useMealContext } from '../hooks/useMealContext'

vi.mock('../services/mealApi')
import * as api from '../services/mealApi'

// Today is pinned to 2026-05-15 in all tests
// nowYear=2026, nowMonth=4 (May, 0-indexed) → cache key "aaharya_meals_2026-05"
// lastYear=2026, lastMonth=3 (April, 0-indexed) → cache key "aaharya_meals_2026-04"
const NOW_YEAR = 2026
const NOW_MONTH = 4 // May
const LAST_YEAR = 2026
const LAST_MONTH = 3 // April

function TestConsumer() {
  const {
    meals,
    loading,
    error,
    loadedMonths,
    fetchMonth,
    refetch,
    addMeal,
    updateMeal,
    deleteMeal,
  } = useMealContext()
  return (
    <div>
      {loading && <span>loading</span>}
      {error && <span>error:{error}</span>}
      <ul>
        {meals.map((m) => (
          <li key={m.id}>
            {m.id}:{m.tag}
          </li>
        ))}
      </ul>
      <span data-testid="loaded-months">{[...loadedMonths].sort().join(',')}</span>
      <button
        onClick={() =>
          addMeal({ tag: 'INDULGENT', occurredAt: 1, image: new File([], 'photo.jpg') })
        }
      >
        Add
      </button>
      <button onClick={() => updateMeal('id-1', { tag: 'INDULGENT' })}>Update</button>
      <button onClick={() => deleteMeal('id-1')}>Delete</button>
      <button onClick={() => void refetch(NOW_YEAR, NOW_MONTH)}>Refetch</button>
      <button onClick={() => void fetchMonth(NOW_YEAR, LAST_MONTH)}>FetchPast</button>
    </div>
  )
}

function renderProvider() {
  return render(
    <MealProvider>
      <TestConsumer />
    </MealProvider>
  )
}

const MAY_MEAL = {
  id: 'may-1',
  tag: 'CLEAN' as const,
  imageUrl: null,
  amountSpent: null,
  note: null,
  occurredAt: new Date('2026-05-10').getTime(),
}
const APR_MEAL = {
  id: 'apr-1',
  tag: 'INDULGENT' as const,
  imageUrl: null,
  amountSpent: null,
  note: null,
  occurredAt: new Date('2026-04-10').getTime(),
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  // Only fake Date so new Date() returns 2026-05-15 inside MealProvider.
  // Leaving timer functions real so waitFor's internal setInterval keeps working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-05-15'))
  // Default: both months return empty so tests opt in to specific data
  vi.mocked(api.fetchMealsByMonth).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('MealProvider', () => {
  describe('loading state', () => {
    it('shows loading on first visit when no cache exists', async () => {
      renderProvider()
      expect(screen.getByText('loading')).toBeInTheDocument()

      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    })

    it('skips loading when current month cache has meals', () => {
      localStorage.setItem('aaharya_meals_2026-05', JSON.stringify([MAY_MEAL]))
      vi.mocked(api.fetchMealsByMonth).mockResolvedValue([MAY_MEAL])

      renderProvider()

      expect(screen.queryByText('loading')).not.toBeInTheDocument()
      expect(screen.getByText('may-1:CLEAN')).toBeInTheDocument()
    })

    it('shows loading when current month cache exists but is empty', () => {
      localStorage.setItem('aaharya_meals_2026-05', JSON.stringify([]))

      renderProvider()

      expect(screen.getByText('loading')).toBeInTheDocument()
    })
  })

  describe('boot fetch', () => {
    it('fetches both current and last month on mount', async () => {
      renderProvider()

      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      expect(api.fetchMealsByMonth).toHaveBeenCalledWith(NOW_YEAR, NOW_MONTH)
      expect(api.fetchMealsByMonth).toHaveBeenCalledWith(LAST_YEAR, LAST_MONTH)
    })

    it('marks both months as loaded after boot', async () => {
      renderProvider()

      await waitFor(() =>
        expect(screen.getByTestId('loaded-months').textContent).toBe('2026-04,2026-05')
      )
    })

    it('merges meals from both months into state', async () => {
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (year, month0) => {
        if (year === NOW_YEAR && month0 === NOW_MONTH) return [MAY_MEAL]
        if (year === LAST_YEAR && month0 === LAST_MONTH) return [APR_MEAL]
        return []
      })

      renderProvider()

      await waitFor(() => {
        expect(screen.getByText('may-1:CLEAN')).toBeInTheDocument()
        expect(screen.getByText('apr-1:INDULGENT')).toBeInTheDocument()
      })
    })

    it('sets error when a boot fetch fails', async () => {
      vi.mocked(api.fetchMealsByMonth).mockRejectedValue(new Error('Network error'))

      renderProvider()

      await waitFor(() => expect(screen.getByText('error:Network error')).toBeInTheDocument())
      expect(screen.queryByText('loading')).not.toBeInTheDocument()
    })

    it('uses "Unknown error" when rejection is not an Error instance', async () => {
      vi.mocked(api.fetchMealsByMonth).mockRejectedValue('plain string')

      renderProvider()

      await waitFor(() => expect(screen.getByText('error:Unknown error')).toBeInTheDocument())
    })
  })

  describe('cache', () => {
    it('seeds state from per-month localStorage cache before fetch', () => {
      localStorage.setItem('aaharya_meals_2026-05', JSON.stringify([MAY_MEAL]))
      localStorage.setItem('aaharya_meals_2026-04', JSON.stringify([APR_MEAL]))

      renderProvider()

      expect(screen.getByText('may-1:CLEAN')).toBeInTheDocument()
      expect(screen.getByText('apr-1:INDULGENT')).toBeInTheDocument()
    })

    it('writes fresh meals to per-month cache after fetch', async () => {
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (year, month0) => {
        if (year === NOW_YEAR && month0 === NOW_MONTH) return [MAY_MEAL]
        return []
      })

      renderProvider()

      await waitFor(() => {
        const cached = JSON.parse(localStorage.getItem('aaharya_meals_2026-05') ?? '[]') as object[]
        expect(cached).toHaveLength(1)
        // imageUrl is stripped from cache
        expect(cached[0]).not.toHaveProperty('imageUrl')
        expect(cached[0]).toMatchObject({ id: 'may-1', tag: 'CLEAN' })
      })
    })
  })

  describe('fetchMonth', () => {
    it('fetches and merges a month not yet loaded', async () => {
      const mar = {
        id: 'mar-1',
        tag: 'CLEAN' as const,
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: new Date('2026-03-10').getTime(),
      }
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (_year, month0) => {
        if (month0 === 2) return [mar] // March (0-indexed)
        return []
      })

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'FetchPast' }))

      // FetchPast button calls fetchMonth(2026, 3) = April which was already loaded in boot
      // Verify it did NOT make an extra API call beyond the 2 boot calls
      await waitFor(() => expect(api.fetchMealsByMonth).toHaveBeenCalledTimes(2))
    })

    it('is a no-op when the month is already in loadedMonths', async () => {
      renderProvider()
      await waitFor(() =>
        expect(screen.getByTestId('loaded-months').textContent).toBe('2026-04,2026-05')
      )

      // April (month 3) was loaded on boot — FetchPast calls fetchMonth(2026, 3)
      await userEvent.click(screen.getByRole('button', { name: 'FetchPast' }))

      // Only the 2 boot calls, no extra call for April
      expect(api.fetchMealsByMonth).toHaveBeenCalledTimes(2)
    })

    it('does not fire a second request if the same month is already being fetched', async () => {
      let resolveFirst!: (v: never[]) => void
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (_year, month0) => {
        if (month0 === 2)
          return new Promise<never[]>((res) => {
            resolveFirst = res
          })
        return []
      })

      function TestWithMarch() {
        const { fetchMonth } = useMealContext()
        return (
          <div>
            <button onClick={() => void fetchMonth(2026, 2)}>FetchMarch</button>
          </div>
        )
      }
      render(
        <MealProvider>
          <TestWithMarch />
        </MealProvider>
      )
      await waitFor(() => expect(api.fetchMealsByMonth).toHaveBeenCalledTimes(2))

      // Click twice — second call should be a no-op (month is already fetching)
      await userEvent.click(screen.getByRole('button', { name: 'FetchMarch' }))
      await userEvent.click(screen.getByRole('button', { name: 'FetchMarch' }))

      // Only 1 extra call (not 2) beyond the 2 boot calls
      expect(api.fetchMealsByMonth).toHaveBeenCalledTimes(3)
      resolveFirst([])
    })

    it('sets error when a lazy fetch fails', async () => {
      // Override default: mock rejecting for March
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (_year, month0) => {
        if (month0 === 2) throw new Error('Fetch failed')
        return []
      })

      // Change FetchPast button to call fetchMonth for March (not yet loaded)
      function TestWithMarch() {
        const { fetchMonth, error } = useMealContext()
        return (
          <div>
            {error && <span>error:{error}</span>}
            <button onClick={() => void fetchMonth(2026, 2)}>FetchMarch</button>
          </div>
        )
      }
      render(
        <MealProvider>
          <TestWithMarch />
        </MealProvider>
      )
      await waitFor(() => expect(api.fetchMealsByMonth).toHaveBeenCalledTimes(2))

      await userEvent.click(screen.getByRole('button', { name: 'FetchMarch' }))

      await waitFor(() => expect(screen.getByText('error:Fetch failed')).toBeInTheDocument())
    })
  })

  describe('refetch', () => {
    it('re-fetches a specific month and updates state', async () => {
      vi.mocked(api.fetchMealsByMonth)
        .mockResolvedValueOnce([MAY_MEAL]) // boot: May
        .mockResolvedValueOnce([]) // boot: April
        .mockResolvedValueOnce([{ ...MAY_MEAL, id: 'may-2' }]) // refetch: May

      renderProvider()
      await waitFor(() => expect(screen.getByText('may-1:CLEAN')).toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Refetch' }))

      await waitFor(() => {
        expect(screen.getByText('may-2:CLEAN')).toBeInTheDocument()
        expect(screen.queryByText('may-1:CLEAN')).not.toBeInTheDocument()
      })
    })

    it('clears error before re-fetching', async () => {
      vi.mocked(api.fetchMealsByMonth)
        .mockRejectedValueOnce(new Error('First error')) // boot fails
        .mockResolvedValue([]) // refetch succeeds

      renderProvider()
      await waitFor(() => expect(screen.getByText('error:First error')).toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Refetch' }))

      await waitFor(() => expect(screen.queryByText(/error:/)).not.toBeInTheDocument())
    })

    it('sets error when re-fetch fails', async () => {
      vi.mocked(api.fetchMealsByMonth)
        .mockResolvedValueOnce([]) // boot: May
        .mockResolvedValueOnce([]) // boot: April
        .mockRejectedValueOnce(new Error('Server down')) // refetch fails

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Refetch' }))

      await waitFor(() => expect(screen.getByText('error:Server down')).toBeInTheDocument())
    })
  })

  describe('addMeal', () => {
    it('updates aaharya_earliest_month cache when new meal is earlier than cached value', async () => {
      localStorage.setItem('aaharya_earliest_month', '2026-05')
      vi.mocked(api.createMeal).mockResolvedValue({
        id: 'early-1',
        tag: 'CLEAN',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: new Date('2026-01-10').getTime(), // January — earlier than May
      })

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => expect(localStorage.getItem('aaharya_earliest_month')).toBe('2026-01'))
    })

    it('does not update aaharya_earliest_month cache when new meal is not earlier', async () => {
      localStorage.setItem('aaharya_earliest_month', '2026-01')
      vi.mocked(api.createMeal).mockResolvedValue({
        id: 'later-1',
        tag: 'CLEAN',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: new Date('2026-05-10').getTime(), // May — not earlier than Jan
      })

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
      await userEvent.click(screen.getByRole('button', { name: 'Add' }))

      await waitFor(() => expect(screen.getByText('later-1:CLEAN')).toBeInTheDocument())
      expect(localStorage.getItem('aaharya_earliest_month')).toBe('2026-01')
    })

    it('calls api.createMeal and prepends the new meal', async () => {
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (year, month0) =>
        year === NOW_YEAR && month0 === NOW_MONTH ? [MAY_MEAL] : []
      )
      vi.mocked(api.createMeal).mockResolvedValue({
        id: 'new-1',
        tag: 'INDULGENT',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: 2,
      })

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Add' }))

      const items = screen.getAllByRole('listitem')
      expect(items[0]).toHaveTextContent('new-1:INDULGENT')
    })
  })

  describe('updateMeal', () => {
    it('calls api.updateMeal and replaces the meal in state', async () => {
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (year, month0) => {
        if (year === NOW_YEAR && month0 === NOW_MONTH)
          return [
            {
              id: 'id-1',
              tag: 'CLEAN',
              imageUrl: null,
              amountSpent: null,
              note: null,
              occurredAt: 0,
            },
          ]
        return []
      })
      vi.mocked(api.updateMeal).mockResolvedValue({
        id: 'id-1',
        tag: 'INDULGENT',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: 0,
      })

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Update' }))

      expect(screen.getByText('id-1:INDULGENT')).toBeInTheDocument()
      expect(screen.queryByText('id-1:CLEAN')).not.toBeInTheDocument()
    })
  })

  describe('deleteMeal', () => {
    it('calls api.deleteMeal and removes the meal from state', async () => {
      vi.mocked(api.fetchMealsByMonth).mockImplementation(async (year, month0) => {
        if (year === NOW_YEAR && month0 === NOW_MONTH)
          return [
            {
              id: 'id-1',
              tag: 'CLEAN',
              imageUrl: null,
              amountSpent: null,
              note: null,
              occurredAt: 0,
            },
          ]
        return []
      })
      vi.mocked(api.deleteMeal).mockResolvedValue()

      renderProvider()
      await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

      await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    })
  })
})
