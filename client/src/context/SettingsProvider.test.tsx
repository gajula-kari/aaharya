import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsProvider } from './SettingsProvider'
import { useSettingsContext } from '../hooks/useSettingsContext'

vi.mock('../services/settingsApi')
import * as settingsApi from '../services/settingsApi'

function TestComponent() {
  const { settings, settingsLoading, saveSettings } = useSettingsContext()
  if (settingsLoading) return <span>Loading</span>
  return (
    <div>
      <span>{settings?.monthlyIndulgentLimit ?? 'no limit'}</span>
      <button onClick={() => void saveSettings(10)}>Save</button>
    </div>
  )
}

function DetailTestComponent() {
  const { settings, settingsLoading, saveSettings } = useSettingsContext()
  return (
    <div>
      {settingsLoading && <span>Loading</span>}
      <span data-testid="limit">{settings?.monthlyIndulgentLimit ?? 'no limit'}</span>
      <span data-testid="previous">{settings?.previousGoal ?? 'no previous'}</span>
      <span data-testid="updated">{settings?.goalUpdatedAt ?? 'no date'}</span>
      <button onClick={() => void saveSettings(15)}>Save</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('SettingsProvider', () => {
  it('fetches settings on mount and exposes them via context', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue({
      monthlyIndulgentLimit: 7,
      previousGoal: null,
      goalUpdatedAt: null,
    })

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    )

    expect(await screen.findByText('7')).toBeInTheDocument()
  })

  it('handles fetchSettings error gracefully', async () => {
    vi.mocked(settingsApi.fetchSettings).mockRejectedValue(new Error('Network error'))

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    )

    await act(async () => {})
    expect(screen.getByText('no limit')).toBeInTheDocument()
  })

  it('calls api.saveSettings and updates context when saveSettings is called', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue(null)
    vi.mocked(settingsApi.saveSettings).mockResolvedValue({
      monthlyIndulgentLimit: 10,
      previousGoal: null,
      goalUpdatedAt: Date.now(),
    })

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    )

    await act(async () => {})
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(settingsApi.saveSettings).toHaveBeenCalledWith(10)
    expect(await screen.findByText('10')).toBeInTheDocument()
  })

  it('updates settings after initialization with null', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue(null)
    vi.mocked(settingsApi.saveSettings).mockResolvedValue({
      monthlyIndulgentLimit: 5,
      previousGoal: null,
      goalUpdatedAt: null,
    })

    render(
      <SettingsProvider>
        <TestComponent />
      </SettingsProvider>
    )

    expect(await screen.findByText('no limit')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('5')).toBeInTheDocument()
  })

  it('exposes settings with all properties', async () => {
    const mockTimestamp = Date.now()
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue({
      monthlyIndulgentLimit: 8,
      previousGoal: 7,
      goalUpdatedAt: mockTimestamp,
    })

    render(
      <SettingsProvider>
        <DetailTestComponent />
      </SettingsProvider>
    )

    expect(await screen.findByTestId('limit')).toHaveTextContent('8')
    expect(screen.getByTestId('previous')).toHaveTextContent('7')
    expect(screen.getByTestId('updated')).toHaveTextContent(String(mockTimestamp))
  })

  it('returns updated settings from saveSettings', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue(null)
    const mockTimestamp = Date.now()
    vi.mocked(settingsApi.saveSettings).mockResolvedValue({
      monthlyIndulgentLimit: 15,
      previousGoal: 12,
      goalUpdatedAt: mockTimestamp,
    })

    render(
      <SettingsProvider>
        <DetailTestComponent />
      </SettingsProvider>
    )

    await waitFor(() => {
      expect(screen.queryByText('Loading')).not.toBeInTheDocument()
    })

    const saveButton = screen.getByRole('button', { name: 'Save' })
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByTestId('limit')).toHaveTextContent('15')
      expect(screen.getByTestId('previous')).toHaveTextContent('12')
    })
  })
})
