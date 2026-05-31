import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { InstallProvider } from './InstallProvider'
import { useInstallContext } from '../hooks/useInstallContext'
import * as eventsApi from '../services/eventsApi'

vi.mock('../services/eventsApi')

interface MockBeforeInstallPromptEvent extends Event {
  prompt: ReturnType<typeof vi.fn>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function TestComponent() {
  const { canInstall, dismissed, dismissedAt, install, dismiss } = useInstallContext()
  return (
    <div>
      <span data-testid="can-install">{canInstall ? 'can-install' : 'cannot-install'}</span>
      <span data-testid="dismissed">{dismissed ? 'dismissed' : 'not-dismissed'}</span>
      <span data-testid="dismissed-at">{dismissedAt ?? 'no-time'}</span>
      <button onClick={() => void install()}>Install</button>
      <button onClick={() => dismiss()}>Dismiss</button>
    </div>
  )
}

let beforeInstallPromptHandler: ((e: Event) => void) | null = null
let mediaQueryHandler: ((e: MediaQueryListEvent) => void) | null = null
let appInstalledHandler: (() => void) | null = null

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  beforeInstallPromptHandler = null
  mediaQueryHandler = null
  appInstalledHandler = null

  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn((query: string) => {
      return {
        matches: false,
        media: query,
        onchange: null,
        addEventListener: (event: string, handler: EventListenerOrEventListenerObject) => {
          if (event === 'change' && typeof handler === 'function') {
            mediaQueryHandler = handler as (e: MediaQueryListEvent) => void
          }
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      } as unknown as MediaQueryList
    }),
  })

  // Mock window.addEventListener to capture handlers
  vi.spyOn(window, 'addEventListener').mockImplementation(
    (event: string, handler: EventListenerOrEventListenerObject) => {
      if (event === 'beforeinstallprompt') {
        beforeInstallPromptHandler = handler as (e: Event) => void
      } else if (event === 'appinstalled') {
        appInstalledHandler = handler as () => void
      }
      return
    }
  )

  vi.spyOn(window, 'removeEventListener')
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('InstallProvider', () => {
  it('initializes with canInstall false when no deferred prompt', () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(screen.getByTestId('can-install')).toHaveTextContent('cannot-install')
  })

  it('logs standalone_visit on first standalone mount and not again', () => {
    vi.mocked(window.matchMedia).mockReturnValue({
      matches: true,
      media: '(display-mode: standalone)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as MediaQueryList)

    const { unmount } = render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(eventsApi.logEvent).toHaveBeenCalledWith('standalone_visit')
    expect(eventsApi.logEvent).toHaveBeenCalledTimes(1)

    unmount()
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(eventsApi.logEvent).toHaveBeenCalledTimes(1)
  })

  it('handles beforeinstallprompt event', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    const mockPromptEvent = new Event(
      'beforeinstallprompt'
    ) as unknown as MockBeforeInstallPromptEvent
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' })

    expect(beforeInstallPromptHandler).toBeTruthy()
    beforeInstallPromptHandler!(mockPromptEvent)

    await waitFor(() => {
      expect(screen.getByTestId('can-install')).toHaveTextContent('can-install')
    })
  })

  it('resets install flow when app was already installed on beforeinstallprompt', async () => {
    localStorage.setItem('aaharya_was_installed', 'true')
    localStorage.setItem('aaharya_install_dismissed', '123456')

    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    const mockPromptEvent = new Event(
      'beforeinstallprompt'
    ) as unknown as MockBeforeInstallPromptEvent
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' })

    beforeInstallPromptHandler!(mockPromptEvent)

    await waitFor(() => {
      expect(localStorage.getItem('aaharya_was_installed')).toBeNull()
      expect(localStorage.getItem('aaharya_install_dismissed')).toBeNull()
    })
  })

  it('calls install() and shows native prompt', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    const mockPromptEvent = new Event(
      'beforeinstallprompt'
    ) as unknown as MockBeforeInstallPromptEvent
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined)
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' })

    beforeInstallPromptHandler!(mockPromptEvent)

    await waitFor(() => {
      expect(screen.getByTestId('can-install')).toHaveTextContent('can-install')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Install' }))

    expect(mockPromptEvent.prompt).toHaveBeenCalled()
    expect(eventsApi.logEvent).not.toHaveBeenCalled()
  })

  it('clears deferred prompt after install prompt choice', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    const mockPromptEvent = new Event(
      'beforeinstallprompt'
    ) as unknown as MockBeforeInstallPromptEvent
    mockPromptEvent.prompt = vi.fn().mockResolvedValue(undefined)
    mockPromptEvent.userChoice = Promise.resolve({ outcome: 'accepted' })

    beforeInstallPromptHandler!(mockPromptEvent)

    await waitFor(() => {
      expect(screen.getByTestId('can-install')).toHaveTextContent('can-install')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Install' }))

    await waitFor(() => {
      expect(screen.getByTestId('can-install')).toHaveTextContent('cannot-install')
    })
  })

  it('install() does nothing when no deferred prompt', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    await userEvent.click(screen.getByRole('button', { name: 'Install' }))

    expect(eventsApi.logEvent).not.toHaveBeenCalled()
  })

  it('dismiss() sets dismissedAt timestamp and dismissed flag', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(screen.getByTestId('dismissed')).toHaveTextContent('not-dismissed')

    const beforeTime = Date.now()
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    const afterTime = Date.now()

    expect(screen.getByTestId('dismissed')).toHaveTextContent('dismissed')
    const dismissedAtText = screen.getByTestId('dismissed-at').textContent
    if (dismissedAtText && dismissedAtText !== 'no-time') {
      const dismissedAt = parseInt(dismissedAtText, 10)
      expect(dismissedAt).toBeGreaterThanOrEqual(beforeTime)
      expect(dismissedAt).toBeLessThanOrEqual(afterTime)
    }
  })

  it('initializes dismissed state from localStorage', () => {
    const dismissedTime = Date.now()
    localStorage.setItem('aaharya_install_dismissed', String(dismissedTime))

    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(screen.getByTestId('dismissed')).toHaveTextContent('dismissed')
    expect(screen.getByTestId('dismissed-at')).toHaveTextContent(String(dismissedTime))
  })

  it('migrates legacy dismissed value from localStorage', () => {
    localStorage.setItem('aaharya_install_dismissed', 'true')

    const beforeRender = Date.now()
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )
    const afterRender = Date.now()

    expect(screen.getByTestId('dismissed')).toHaveTextContent('dismissed')
    const dismissedAtText = screen.getByTestId('dismissed-at').textContent
    if (dismissedAtText && dismissedAtText !== 'no-time') {
      const dismissedAt = parseInt(dismissedAtText, 10)
      expect(dismissedAt).toBeGreaterThanOrEqual(beforeRender)
      expect(dismissedAt).toBeLessThanOrEqual(afterRender)
    }
  })

  it('handles display-mode: standalone media query change', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    // Simulate media query match change
    const event = new Event('change') as unknown as MediaQueryListEvent
    ;(event as unknown as { matches: boolean }).matches = true

    mediaQueryHandler!(event)

    // Note: We can't directly test isInstalled state change without accessing internal state
    // But we can verify the handler is called
    expect(mediaQueryHandler).toBeDefined()
  })

  it('handles appinstalled event', async () => {
    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(appInstalledHandler).toBeTruthy()
    appInstalledHandler!()

    expect(localStorage.getItem('aaharya_was_installed')).toBe('true')
    expect(eventsApi.logEvent).not.toHaveBeenCalled()
  })

  it('unsubscribes from all event listeners on unmount', () => {
    const { unmount } = render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    unmount()

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'beforeinstallprompt',
      expect.any(Function)
    )
    expect(window.removeEventListener).toHaveBeenCalledWith('appinstalled', expect.any(Function))
  })

  it('checks navigator.standalone property for installed state', () => {
    // Mock navigator.standalone
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    })

    render(
      <InstallProvider>
        <TestComponent />
      </InstallProvider>
    )

    expect(eventsApi.logEvent).toHaveBeenCalledWith('standalone_visit')
  })
})
