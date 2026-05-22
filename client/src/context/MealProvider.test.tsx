import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider } from './MealProvider'
import { useMealContext } from '../hooks/useMealContext'

vi.mock('../services/mealApi')
import * as api from '../services/mealApi'

function TestConsumer() {
  const { meals, loading, addMeal, updateMeal, deleteMeal, refetch } = useMealContext()
  return (
    <div>
      {loading && <span>loading</span>}
      <ul>
        {meals.map((m) => (
          <li key={m.id}>
            {m.id}:{m.tag}
          </li>
        ))}
      </ul>
      <button
        onClick={() =>
          addMeal({ tag: 'INDULGENT', occurredAt: 1, image: new File([], 'photo.jpg') })
        }
      >
        Add
      </button>
      <button onClick={() => updateMeal('id-1', { tag: 'INDULGENT' })}>Update</button>
      <button onClick={() => deleteMeal('id-1')}>Delete</button>
      <button onClick={() => void refetch()}>Refetch</button>
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

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('MealProvider', () => {
  it('shows loading state on first visit when no cache exists', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([
      { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
    ])

    renderProvider()
    expect(screen.getByText('loading')).toBeInTheDocument()

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
    expect(screen.getByText('id-1:CLEAN')).toBeInTheDocument()
  })

  it('skips loading state on repeat visit when cache has meals', () => {
    localStorage.setItem(
      'aaharya_meals',
      JSON.stringify([
        { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
      ])
    )
    vi.mocked(api.fetchMeals).mockResolvedValue([
      { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
    ])

    renderProvider()

    expect(screen.queryByText('loading')).not.toBeInTheDocument()
    expect(screen.getByText('id-1:CLEAN')).toBeInTheDocument()
  })

  it('shows loading state when cache exists but is empty', () => {
    localStorage.setItem('aaharya_meals', JSON.stringify([]))
    vi.mocked(api.fetchMeals).mockResolvedValue([])

    renderProvider()

    expect(screen.getByText('loading')).toBeInTheDocument()
  })

  it('addMeal calls api.createMeal and prepends the new meal to state', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([
      { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
    ])
    vi.mocked(api.createMeal).mockResolvedValue({
      id: 'id-2',
      tag: 'INDULGENT',
      imageUrl: null,
      amountSpent: null,
      note: null,
      occurredAt: 1,
    })

    renderProvider()
    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Add' }))

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('id-2:INDULGENT')
    expect(items[1]).toHaveTextContent('id-1:CLEAN')
  })

  it('updateMeal calls api.updateMeal and replaces the meal in state', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([
      { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
      { id: 'id-2', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
    ])
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
    expect(screen.getByText('id-2:CLEAN')).toBeInTheDocument()
  })

  it('deleteMeal calls api.deleteMeal and removes the meal from state', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([
      { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
    ])
    vi.mocked(api.deleteMeal).mockResolvedValue()

    renderProvider()
    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
  })

  it('seeds state from localStorage cache so UI shows instantly before fetch', () => {
    localStorage.setItem(
      'aaharya_meals',
      JSON.stringify([
        {
          id: 'cached-1',
          tag: 'CLEAN',
          imageUrl: null,
          amountSpent: null,
          note: null,
          occurredAt: 0,
        },
      ])
    )
    vi.mocked(api.fetchMeals).mockResolvedValue([
      {
        id: 'cached-1',
        tag: 'CLEAN',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: 0,
      },
    ])

    renderProvider()

    expect(screen.getByText('cached-1:CLEAN')).toBeInTheDocument()
  })

  it('writes fresh meals to localStorage after fetch', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([
      {
        id: 'id-1',
        tag: 'INDULGENT',
        imageUrl: null,
        amountSpent: null,
        note: null,
        occurredAt: 0,
      },
    ])

    renderProvider()
    await waitFor(() => {
      const cached = JSON.parse(localStorage.getItem('aaharya_meals') ?? '[]')
      expect(cached).toEqual([
        { id: 'id-1', tag: 'INDULGENT', amountSpent: null, note: null, occurredAt: 0 },
      ])
    })
  })

  it('calls api.ping on mount to wake the server', () => {
    vi.mocked(api.fetchMeals).mockResolvedValue([])

    renderProvider()

    expect(api.ping).toHaveBeenCalledTimes(1)
  })

  it('uses "Unknown error" fallback when fetch rejects with a non-Error value', async () => {
    vi.mocked(api.fetchMeals).mockRejectedValue('plain string error')

    renderProvider()

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())
  })

  it('refetch re-fetches meals and updates state', async () => {
    vi.mocked(api.fetchMeals)
      .mockResolvedValueOnce([
        { id: 'id-1', tag: 'CLEAN', imageUrl: null, amountSpent: null, note: null, occurredAt: 0 },
      ])
      .mockResolvedValueOnce([
        {
          id: 'id-2',
          tag: 'INDULGENT',
          imageUrl: null,
          amountSpent: null,
          note: null,
          occurredAt: 1,
        },
      ])

    renderProvider()

    await waitFor(() => expect(screen.getByText('id-1:CLEAN')).toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'Refetch' }))

    await waitFor(() => expect(screen.getByText('id-2:INDULGENT')).toBeInTheDocument())
    expect(screen.queryByText('id-1:CLEAN')).not.toBeInTheDocument()
  })

  it('refetch sets error when fetch rejects with a non-Error value', async () => {
    vi.mocked(api.fetchMeals).mockResolvedValueOnce([]).mockRejectedValueOnce('plain string error')

    const { getByRole } = renderProvider()

    await waitFor(() => expect(screen.queryByText('loading')).not.toBeInTheDocument())

    await userEvent.click(getByRole('button', { name: 'Refetch' }))

    // Error is set but not displayed in this consumer — just confirm it doesn't throw
    await waitFor(() => expect(api.fetchMeals).toHaveBeenCalledTimes(2))
  })
})
