import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Settings from './Settings'

vi.mock('../hooks/useSettingsContext')
vi.mock('../hooks/useInstallContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

import { useSettingsContext } from '../hooks/useSettingsContext'
import { useNavigate } from 'react-router-dom'
import { useInstallContext } from '../hooks/useInstallContext'

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
    dismissed: false,
    dismissedAt: null,
    install: vi.fn(),
    dismiss: vi.fn(),
  })
  mockSaveSettings.mockResolvedValue({
    monthlyIndulgentLimit: 7,
    previousGoal: null,
    goalUpdatedAt: Date.now(),
  })
  vi.mocked(useSettingsContext).mockReturnValue({
    settings: null,
    settingsLoading: false,
    saveSettings: mockSaveSettings,
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
      settings: { monthlyIndulgentLimit: 10, previousGoal: null, goalUpdatedAt: null },
      settingsLoading: false,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(await screen.findByDisplayValue('10')).toBeInTheDocument()
  })

  it('shows previous goal when one exists', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 10, previousGoal: 5, goalUpdatedAt: 1700000000000 },
      settingsLoading: false,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(await screen.findByText('Previous goal: 5 days')).toBeInTheDocument()
  })

  it('shows last updated date when goalUpdatedAt exists', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 10, previousGoal: null, goalUpdatedAt: 1700000000000 },
      settingsLoading: false,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    expect(await screen.findByText(/Last updated:/)).toBeInTheDocument()
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

describe('saving', () => {
  it('calls saveSettings with the chosen goal and navigates to /', async () => {
    const navigate = vi.fn()
    vi.mocked(useNavigate).mockReturnValue(navigate)
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '7' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(mockSaveSettings).toHaveBeenCalledWith(7)
    expect(navigate).toHaveBeenCalledWith('/', { replace: true })
  })

  it('shows validation error when the goal is set to 0', async () => {
    vi.mocked(useSettingsContext).mockReturnValue({
      settings: { monthlyIndulgentLimit: 7 },
      settingsLoading: false,
      saveSettings: mockSaveSettings,
    })
    renderSettings()
    const input = screen.getByRole('spinbutton')
    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByText('Please enter a valid number')).toBeInTheDocument()
  })

  it('shows an error message when saveSettings throws', async () => {
    mockSaveSettings.mockRejectedValue(new Error('Network error'))
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Failed to save. Try again.')).toBeInTheDocument()
  })

  it('shows "Saving…" on the button while the request is in flight', async () => {
    let resolve!: (value: {
      monthlyIndulgentLimit: number
      previousGoal: null
      goalUpdatedAt: number
    }) => void
    mockSaveSettings.mockReturnValue(new Promise((r) => (resolve = r)))
    renderSettings()

    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByRole('button', { name: 'Saving' })).toBeInTheDocument()
    resolve({ monthlyIndulgentLimit: 5, previousGoal: null, goalUpdatedAt: Date.now() })
  })
})
