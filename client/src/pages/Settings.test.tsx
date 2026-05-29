import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Settings from './Settings'
import { ERROR_MESSAGES } from '../constants/errors'

vi.mock('../hooks/useSettingsContext')
vi.mock('../hooks/useInstallContext')
vi.mock('../hooks/useAuthContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

import { useSettingsContext } from '../hooks/useSettingsContext'
import { useNavigate } from 'react-router-dom'
import { useInstallContext } from '../hooks/useInstallContext'
import { useAuthContext } from '../hooks/useAuthContext'

function renderSettings() {
  return render(
    <MemoryRouter>
      <Settings />
    </MemoryRouter>
  )
}

const mockSaveSettings = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useInstallContext).mockReturnValue({
    canInstall: false,
    canInstallIos: false,
    dismissed: false,
    dismissedAt: null,
    install: vi.fn(),
    dismiss: vi.fn(),
  })
  mockSaveSettings.mockResolvedValue({
    currentMonthlyLimit: 7,
  })
  vi.mocked(useSettingsContext).mockReturnValue({
    settings: null,
    settingsLoading: false,
    settingsError: null,
    saveSettings: mockSaveSettings,
  })
  vi.mocked(useAuthContext).mockReturnValue({
    user: null,
    isLoggedIn: true,
    isSkipped: false,
    isLoading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    skip: vi.fn(),
    unSkip: vi.fn(),
  })
})

describe('install section', () => {
  it('does not show the install section when canInstall is false', () => {
    renderSettings()
    expect(screen.queryByRole('button', { name: 'Install App' })).not.toBeInTheDocument()
  })

  it('does not show the install section when banner was not yet dismissed', () => {
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      canInstallIos: false,
      dismissed: false,
      dismissedAt: null,
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderSettings()
    expect(screen.queryByRole('button', { name: 'Install App' })).not.toBeInTheDocument()
  })

  it('shows the install section when canInstall and dismissed', () => {
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      canInstallIos: false,
      dismissed: true,
      dismissedAt: Date.now(),
      install: vi.fn(),
      dismiss: vi.fn(),
    })
    renderSettings()
    expect(screen.getByRole('button', { name: 'Install App' })).toBeInTheDocument()
  })

  it('calls install when Install App button is clicked', async () => {
    const install = vi.fn()
    vi.mocked(useInstallContext).mockReturnValue({
      canInstall: true,
      canInstallIos: false,
      dismissed: true,
      dismissedAt: Date.now(),
      install,
      dismiss: vi.fn(),
    })
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Install App' }))
    expect(install).toHaveBeenCalled()
  })
})

describe('Settings loading state', () => {
  it('shows a spinner while settings are loading and no cached data exists', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: null,
      settingsLoading: true,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('does not show a spinner when settings are already loaded', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 7 },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument()
  })

  it('shows saved value in input when settings arrive after mount', async () => {
    // Start with no settings — goal derives to empty string
    const { rerender } = renderSettings()
    expect(screen.getByRole('spinbutton')).toHaveValue(null)

    // Settings load in — goal derives from savedGoal automatically (no effect needed)
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 10 },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    rerender(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    )

    expect(screen.getByRole('spinbutton')).toHaveValue(10)
  })
})

describe('Settings rendering', () => {
  it('renders the heading and description', () => {
    renderSettings()
    expect(screen.getByText('Indulgent Days Limit')).toBeInTheDocument()
    expect(
      screen.getByText('Set how many indulgent days you allow yourself per month')
    ).toBeInTheDocument()
  })

  it('renders all quick-pick chips', () => {
    renderSettings()
    ;[3, 5, 7, 10, 15].forEach((n) => {
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument()
    })
  })

  it('renders the Save button', () => {
    renderSettings()
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
  })
})

describe('Settings with existing data', () => {
  it('pre-fills the input with the current goal', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 10 },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument()
  })

  it('shows the current month note', () => {
    renderSettings()
    expect(screen.getByText(/Changes apply to current month/)).toBeInTheDocument()
  })
})

describe('quick-pick chips', () => {
  it('clicking a chip sets that value in the input', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: '7' }))
    expect(screen.getByRole('spinbutton')).toHaveValue(7)
  })

  it('typing a custom number directly into the input updates the value', async () => {
    renderSettings()
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '12')
    expect(input).toHaveValue(12)
  })

  it('the selected chip gets a dark background class', async () => {
    renderSettings()
    const chip = screen.getByRole('button', { name: '10' })
    await userEvent.click(chip)
    expect(chip).toHaveClass('bg-slate')
  })
})

describe('logout flow', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.mocked(useAuthContext).mockReturnValue({
      user: { email: 'test@example.com' },
      isLoggedIn: true,
      isSkipped: false,
      isLoading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: mockLogout,
      skip: vi.fn(),
      unSkip: vi.fn(),
    })
  })

  it('shows a Log out button when isLoggedIn and user has email', () => {
    renderSettings()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('shows a confirmation dialog with Cancel and Log out buttons after clicking Log out', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('hides the confirmation dialog when Cancel is clicked', async () => {
    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('calls logout() and navigates to /login when Log out is confirmed', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    mockLogout.mockResolvedValue(undefined)

    renderSettings()
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(mockLogout).toHaveBeenCalled()
    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith('/login', { replace: true })
    })
  })
})

describe('goal history', () => {
  it('does not show the history section when goalHistory is empty', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 4, goalHistory: [] },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(screen.queryByText('Goal History')).not.toBeInTheDocument()
  })

  it('shows the history section with a single entry', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 4, goalHistory: [{ goal: 4, month: '2026-05' }] },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(screen.getByText('Goal History')).toBeInTheDocument()
    expect(screen.getByText('May 2026 — 4 days/month')).toBeInTheDocument()
  })

  it('shows goal history entries in reverse chronological order when 2+ entries exist', () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: {
        currentMonthlyLimit: 4,
        goalHistory: [
          { goal: 6, month: '2026-03' },
          { goal: 4, month: '2026-05' },
        ],
      },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(screen.getByText('Goal History')).toBeInTheDocument()
    const items = screen.getAllByText(/days\/month/)
    // Newest first: May 2026 before March 2026
    expect(items[0]).toHaveTextContent('May 2026 — 4 days/month')
    expect(items[1]).toHaveTextContent('March 2026 — 6 days/month')
  })
})

describe('saving', () => {
  it('calls saveSettings with the chosen goal and stays on the settings page', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '7' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockSaveSettings).toHaveBeenCalledWith(7)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows validation error when the goal is set to 0', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { currentMonthlyLimit: 7, goalHistory: [] },
      settingsLoading: false,
      settingsError: null,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText(ERROR_MESSAGES.SETTINGS_INVALID_LIMIT)).toBeInTheDocument()
  })

  it('shows an error message when saveSettings throws', async () => {
    mockSaveSettings.mockRejectedValue(new Error('Network error'))
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText(ERROR_MESSAGES.SETTINGS_SAVE_FAILED)).toBeInTheDocument()
  })

  it('shows "Saving…" on the button while the request is in flight', async () => {
    let resolve!: (value: { currentMonthlyLimit: number }) => void
    mockSaveSettings.mockReturnValue(new Promise((r) => (resolve = r)))
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('button', { name: 'Saving' })).toBeInTheDocument()
    resolve({ currentMonthlyLimit: 5 })
  })
})
