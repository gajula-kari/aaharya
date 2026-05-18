import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Onboard from './Onboard'

vi.mock('../hooks/useSettingsContext')
import { useSettingsContext } from '../hooks/useSettingsContext'

const mockSaveSettings = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  mockSaveSettings.mockResolvedValue({
    monthlyIndulgentLimit: 7,
    previousGoal: null,
    goalUpdatedAt: null,
  })
  vi.mocked(useSettingsContext).mockReturnValue({
    settings: null,
    settingsLoading: false,
    saveSettings: mockSaveSettings,
  })
})

function renderOnboard(onComplete = vi.fn()) {
  return render(
    <MemoryRouter>
      <Onboard onComplete={onComplete} />
    </MemoryRouter>
  )
}

async function goToScreen2() {
  await userEvent.click(screen.getByRole('button', { name: "Let's fix that →" }))
}

async function goToScreen3() {
  await goToScreen2()
  await userEvent.click(screen.getByRole('button', { name: 'Makes sense →' }))
}

async function goToScreen4ViaSetLimit() {
  await goToScreen3()
  await userEvent.click(screen.getByRole('button', { name: 'Set limit' }))
  await waitFor(() => expect(mockSaveSettings).toHaveBeenCalled())
}

describe('screen 1', () => {
  it('renders the problem headline', () => {
    renderOnboard()
    expect(screen.getByText(/Eating out more/)).toBeInTheDocument()
  })

  it('renders the CTA button', () => {
    renderOnboard()
    expect(screen.getByRole('button', { name: "Let's fix that →" })).toBeInTheDocument()
  })

  it('advances to screen 2 on CTA click', async () => {
    renderOnboard()
    await goToScreen2()
    expect(screen.getByText(/Stay aware of/i)).toBeInTheDocument()
  })
})

describe('screen 2', () => {
  it('shows the rule headline and two day-type cards', async () => {
    renderOnboard()
    await goToScreen2()
    expect(screen.getByText('Clean day')).toBeInTheDocument()
    expect(screen.getByText('Indulgent day')).toBeInTheDocument()
  })

  it('advances to screen 3 on Makes sense click', async () => {
    renderOnboard()
    await goToScreen3()
    expect(screen.getByText('Set your monthly limit')).toBeInTheDocument()
  })
})

describe('screen 3 — set limit', () => {
  it('renders all five quick-pick chips', async () => {
    renderOnboard()
    await goToScreen3()
    ;[3, 5, 7, 10, 15].forEach((n) => {
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument()
    })
  })

  it('Set limit is enabled by default (slider starts at 7)', async () => {
    renderOnboard()
    await goToScreen3()
    expect(screen.getByRole('button', { name: 'Set limit' })).toBeEnabled()
  })

  it('clicking a chip passes its value to saveSettings on submit', async () => {
    renderOnboard()
    await goToScreen3()
    await userEvent.click(screen.getByRole('button', { name: '10' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set limit' }))
    await waitFor(() => expect(mockSaveSettings).toHaveBeenCalledWith(10))
  })

  it('Set limit calls saveSettings with the current limit', async () => {
    renderOnboard()
    await goToScreen3()
    await userEvent.click(screen.getByRole('button', { name: '5' }))
    await userEvent.click(screen.getByRole('button', { name: 'Set limit' }))
    await waitFor(() => expect(mockSaveSettings).toHaveBeenCalledWith(5))
  })

  it('Set limit sets aaharya_onboarded in localStorage', async () => {
    renderOnboard()
    await goToScreen4ViaSetLimit()
    expect(localStorage.getItem('aaharya_onboarded')).toBe('true')
  })

  it('Set limit advances to screen 4', async () => {
    renderOnboard()
    await goToScreen4ViaSetLimit()
    expect(screen.getByText('Your month at a glance')).toBeInTheDocument()
  })

  it('Skip for now skips saveSettings and advances to screen 4', async () => {
    renderOnboard()
    await goToScreen3()
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(mockSaveSettings).not.toHaveBeenCalled()
    expect(screen.getByText('Your month at a glance')).toBeInTheDocument()
  })

  it('Skip for now sets aaharya_onboarded in localStorage', async () => {
    renderOnboard()
    await goToScreen3()
    await userEvent.click(screen.getByRole('button', { name: 'Skip for now' }))
    expect(localStorage.getItem('aaharya_onboarded')).toBe('true')
  })
})

describe('screen 4 — calendar', () => {
  it('shows the calendar intro heading', async () => {
    renderOnboard()
    await goToScreen4ViaSetLimit()
    expect(screen.getByText('Your month at a glance')).toBeInTheDocument()
  })

  it('Start logging calls onComplete', async () => {
    const onComplete = vi.fn()
    renderOnboard(onComplete)
    await goToScreen4ViaSetLimit()
    await userEvent.click(screen.getByRole('button', { name: 'Start logging →' }))
    expect(onComplete).toHaveBeenCalledTimes(1)
  })
})
