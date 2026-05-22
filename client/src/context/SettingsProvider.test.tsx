import { render, screen, act } from '@testing-library/react'
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
      <button onClick={() => saveSettings(10)}>Save</button>
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
})
