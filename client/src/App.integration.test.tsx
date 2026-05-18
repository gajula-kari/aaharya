import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MealProvider } from './context/MealProvider'
import { SettingsProvider } from './context/SettingsProvider'
import App from './App'

beforeEach(() => {
  localStorage.setItem('aaharya_onboarded', 'true')
  vi.stubGlobal('fetch', vi.fn())
})

afterEach(() => {
  vi.unstubAllGlobals()
  window.history.pushState({}, '', '/')
})

function mockFetch(meals: unknown[]) {
  vi.mocked(fetch).mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ meals }),
  } as unknown as Response)
}

function mockFetchError(message: string) {
  vi.mocked(fetch).mockResolvedValue({
    ok: false,
    json: vi.fn().mockResolvedValue({ error: message }),
  } as unknown as Response)
}

function renderApp() {
  return render(
    <MealProvider>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </MealProvider>
  )
}

describe('App integration', () => {
  it('shows a spinner while loading then renders the calendar once data arrives', async () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    mockFetch([{ _id: 'meal-1', tag: 'HOME', occurredAt: today.getTime() }])

    renderApp()

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
    expect(await screen.findByText('Clean days')).toBeInTheDocument()
  })

  it('renders the stats section when the server returns an empty meals list', async () => {
    mockFetch([])
    renderApp()

    expect(await screen.findByText('Clean days')).toBeInTheDocument()
    expect(screen.queryByText(/🌱/)).not.toBeInTheDocument()
  })

  it('shows the server error message when fetch fails', async () => {
    mockFetchError('Failed to connect to database')
    renderApp()

    expect(await screen.findByText('Failed to connect to database')).toBeInTheDocument()
  })

  it('normalizes _id to id through the full stack', async () => {
    const today = new Date()
    today.setHours(12, 0, 0, 0)

    mockFetch([{ _id: 'mongo-id-123', tag: 'HOME', occurredAt: today.getTime() }])

    renderApp()

    expect(await screen.findByText('Clean days')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/meals', expect.anything())
  })
})

describe('Onboarding', () => {
  it('completes onboarding flow and shows the home screen', async () => {
    localStorage.clear()
    mockFetch([])
    renderApp()

    await userEvent.click(await screen.findByRole('button', { name: "Let's fix that →" }))
    await userEvent.click(screen.getByRole('button', { name: 'Makes sense →' }))
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    await userEvent.click(screen.getByRole('button', { name: 'Start logging →' }))

    expect(await screen.findByText('clean days')).toBeInTheDocument()
  })
})

describe('Header', () => {
  it('shows "Aaharya" button and no back arrow after navigating to /settings', async () => {
    mockFetch([])
    renderApp()

    await screen.findByText('Clean days')
    await userEvent.click(screen.getByRole('button', { name: 'Settings' }))

    expect(await screen.findByRole('button', { name: /Aaharya/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
  })
})
