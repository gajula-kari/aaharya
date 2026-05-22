import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider } from './context/MealProvider'
import { SettingsProvider } from './context/SettingsProvider'
import type { ReactNode } from 'react'

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: ReactNode }) => (
      <actual.MemoryRouter initialEntries={[initialPath]}>{children}</actual.MemoryRouter>
    ),
    useNavigate: vi.fn(() => vi.fn()),
  }
})

let initialPath = '/'

import App from './App'
import { useNavigate } from 'react-router-dom'

beforeEach(() => {
  initialPath = '/'
  localStorage.setItem('aaharya_onboarded', 'true')
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ meals: [] }),
    })
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderApp() {
  return render(
    <MealProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </MealProvider>
  )
}

describe('Header streak', () => {
  function mealsForDays(count: number) {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      return { _id: `meal-${i}`, tag: 'CLEAN', occurredAt: d.getTime() }
    })
  }

  it('hides streak indicator when streak < 3', async () => {
    renderApp()
    expect(await screen.findByText('clean days')).toBeInTheDocument()
    expect(screen.queryByText(/🌱/)).not.toBeInTheDocument()
  })

  it('shows 🌱 3 in header when streak reaches 3', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ meals: mealsForDays(3) }),
      })
    )
    renderApp()
    expect(await screen.findByText('🌱 3')).toBeInTheDocument()
  })
})

describe('Header on sub-pages', () => {
  it('shows Back button on /settings', () => {
    initialPath = '/settings'
    renderApp()

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('shows Back button on /day sub-pages', () => {
    initialPath = '/day/2024-01-01'
    renderApp()

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('shows Back button on /meals', () => {
    initialPath = '/meals'
    renderApp()

    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('shows meal count subtitle on /meals when meals exist', async () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({
          meals: [{ _id: 'm1', tag: 'CLEAN', occurredAt: today.getTime() }],
        }),
      })
    )
    initialPath = '/meals'
    renderApp()

    expect(await screen.findByText(/1 meal/)).toBeInTheDocument()
  })

  it('Back button on /day navigates back', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    initialPath = '/day/2024-01-01'
    renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('Back button on /meals navigates back', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    initialPath = '/meals'
    renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith(-1)
  })

  it('Back button on /settings navigates to / with replace', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    initialPath = '/settings'
    renderApp()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it("shows Back button on today's /day page without · past badge", () => {
    const today = new Date()
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
    initialPath = `/day/${todayStr}`
    renderApp()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.queryByText('· past')).not.toBeInTheDocument()
  })

  it('aaharya logo button on / navigates to / with replace', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    initialPath = '/'
    renderApp()

    await userEvent.click(screen.getByRole('button', { name: /aaharya/i }))

    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })
})
