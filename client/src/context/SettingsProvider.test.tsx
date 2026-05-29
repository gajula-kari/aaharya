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
      <span>{settings?.currentMonthlyLimit ?? 'no limit'}</span>
      <button onClick={() => void saveSettings(10)}>Save</button>
    </div>
  )
}

function DetailTestComponent() {
  const { settings, settingsLoading, saveSettings } = useSettingsContext()
  return (
    <div>
      {settingsLoading && <span>Loading</span>}
      <span data-testid="limit">{settings?.currentMonthlyLimit ?? 'no limit'}</span>
      <button onClick={() => void saveSettings(15)}>Save</button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('SettingsProvider', () => {
  it('fetches settings on mount and exposes them via context', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue({
      currentMonthlyLimit: 7,
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
      currentMonthlyLimit: 10,
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
      currentMonthlyLimit: 5,
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
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue({
      currentMonthlyLimit: 8,
      goalHistory: [{ goal: 7, month: '2026-04' }],
    })

    render(
      <SettingsProvider>
        <DetailTestComponent />
      </SettingsProvider>
    )

    expect(await screen.findByTestId('limit')).toHaveTextContent('8')
  })

  it('returns updated settings from saveSettings', async () => {
    vi.mocked(settingsApi.fetchSettings).mockResolvedValue(null)
    vi.mocked(settingsApi.saveSettings).mockResolvedValue({
      currentMonthlyLimit: 15,
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
    })
  })
})
