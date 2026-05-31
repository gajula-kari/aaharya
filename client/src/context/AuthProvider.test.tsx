import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from './AuthProvider'
import { useAuthContext } from '../hooks/useAuthContext'
import * as authApi from '../services/authApi'
import * as settingsApi from '../services/settingsApi'
import * as deviceId from '../utils/deviceId'

vi.mock('../services/authApi')
vi.mock('../services/settingsApi')
vi.mock('../utils/deviceId')

function TestComponent() {
  const {
    user,
    isLoggedIn,
    isAnonymous,
    isLoading,
    sessionExpired,
    login,
    register,
    logout,
    skip,
  } = useAuthContext()
  return (
    <div>
      <span data-testid="user">{user?.email ?? 'no user'}</span>
      <span data-testid="logged-in">{isLoggedIn ? 'logged in' : 'logged out'}</span>
      <span data-testid="anonymous">{isAnonymous ? 'anonymous' : 'not anonymous'}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>
      <span data-testid="expired">{sessionExpired ? 'expired' : 'not expired'}</span>

      <button onClick={() => login('test@example.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={() => register('test@example.com', 'password')} data-testid="register-btn">
        Register
      </button>
      <button onClick={() => logout()} data-testid="logout-btn">
        Logout
      </button>
      <button onClick={() => void skip().catch(() => {})} data-testid="skip-btn">
        Skip
      </button>
    </div>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.mocked(deviceId.getDeviceId).mockReturnValue('device-123')
})

describe('AuthProvider', () => {
  describe('initialization', () => {
    it('shows loading state initially', () => {
      localStorage.setItem('aaharya_has_session', 'true')
      vi.mocked(authApi.refreshSession).mockImplementation(() => new Promise(() => {}))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    })

    it('sets user and loading to false after refresh succeeds', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      const mockUser = { email: 'user@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user@example.com'))
      expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged in')
    })

    it('sets user to null and loading to false when refresh fails', async () => {
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      })
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged out')
    })

    it('calls refreshSession and sets user when oauth=1 is in the query string', async () => {
      const originalLocation = window.location
      Object.defineProperty(window, 'location', {
        value: {
          ...originalLocation,
          search: '?oauth=1',
          href: 'http://localhost/?oauth=1',
          pathname: '/',
        },
        writable: true,
        configurable: true,
      })

      const mockUser = { email: 'oauth@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('oauth@example.com'))
      expect(authApi.refreshSession).toHaveBeenCalled()

      Object.defineProperty(window, 'location', {
        value: originalLocation,
        writable: true,
        configurable: true,
      })
    })

    it('clears aaharya_has_session key when refresh resolves with null', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('loading')).toHaveTextContent('ready')
      })

      expect(localStorage.getItem('aaharya_has_session')).toBeNull()
    })

    it('sets sessionExpired when has_session was set but refresh returns null', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('expired')).toHaveTextContent('expired')
      })
    })

    it('does not set sessionExpired for a new user with no prior session', async () => {
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // isLoading never becomes true, so no refresh runs
      expect(screen.getByTestId('expired')).toHaveTextContent('not expired')
    })
  })

  describe('login', () => {
    beforeEach(() => {
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)
    })

    it('calls authApi.login and sets user', async () => {
      const mockUser = { email: 'test@example.com' }
      vi.mocked(authApi.login).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('login-btn'))
      })

      expect(authApi.login).toHaveBeenCalledWith('test@example.com', 'password')
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged in')
    })

    it('syncs pending limit if present', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      const mockUser = { email: 'test@example.com' }
      vi.mocked(authApi.login).mockResolvedValue(mockUser)
      vi.mocked(settingsApi.saveSettings).mockResolvedValue({
        currentMonthlyLimit: 10,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('login-btn'))
      })

      await waitFor(() => {
        expect(settingsApi.saveSettings).toHaveBeenCalledWith(10)
      })
      expect(localStorage.getItem('aaharya_pending_limit')).toBeNull()
    })

    it('logs raw rejection when syncPendingData fails with non-Error', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      const mockUser = { email: 'test@example.com' }
      vi.mocked(authApi.login).mockResolvedValue(mockUser)
      vi.mocked(settingsApi.saveSettings).mockRejectedValue('server error string')
      vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      await act(async () => {
        await userEvent.click(screen.getByTestId('login-btn'))
      })
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('test@example.com'))

      expect(console.error).toHaveBeenCalledWith(
        '[auth] syncPendingData: failed to save pending limit:',
        'server error string'
      )
      vi.mocked(console.error).mockRestore()
    })

    it('handles saveSettings failure gracefully', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      const mockUser = { email: 'test@example.com' }
      vi.mocked(authApi.login).mockResolvedValue(mockUser)
      vi.mocked(settingsApi.saveSettings).mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('login-btn'))
      })

      await waitFor(() => {
        expect(settingsApi.saveSettings).toHaveBeenCalledWith(10)
      })
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com')
    })
  })

  describe('register', () => {
    beforeEach(() => {
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)
    })

    it('calls authApi.register and sets user', async () => {
      const mockUser = { email: 'new@example.com' }
      vi.mocked(authApi.register).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('register-btn'))
      })

      expect(authApi.register).toHaveBeenCalledWith('test@example.com', 'password')
      expect(screen.getByTestId('user')).toHaveTextContent('new@example.com')
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged in')
    })

    it('syncs pending limit during register', async () => {
      localStorage.setItem('aaharya_pending_limit', '7')
      const mockUser = { email: 'new@example.com' }
      vi.mocked(authApi.register).mockResolvedValue(mockUser)
      vi.mocked(settingsApi.saveSettings).mockResolvedValue({
        currentMonthlyLimit: 7,
      })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('register-btn'))
      })

      await waitFor(() => {
        expect(settingsApi.saveSettings).toHaveBeenCalledWith(7)
      })
      expect(localStorage.getItem('aaharya_pending_limit')).toBeNull()
    })
  })

  describe('logout', () => {
    it('clears per-month meal cache keys on logout', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      localStorage.setItem('aaharya_meals_2026-05', '[]')
      localStorage.setItem('aaharya_other_key', 'stays')
      const mockUser = { email: 'user@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValue(mockUser)
      vi.mocked(authApi.logout).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user@example.com'))

      await act(async () => {
        await userEvent.click(screen.getByTestId('logout-btn'))
      })

      expect(localStorage.getItem('aaharya_meals_2026-05')).toBeNull()
      expect(localStorage.getItem('aaharya_other_key')).toBe('stays')
    })

    it('calls authApi.logout and clears user', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      const mockUser = { email: 'user@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValue(mockUser)
      vi.mocked(authApi.logout).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('user@example.com'))

      await act(async () => {
        await userEvent.click(screen.getByTestId('logout-btn'))
      })

      expect(authApi.logout).toHaveBeenCalled()
      expect(screen.getByTestId('user')).toHaveTextContent('no user')
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged out')
    })
  })

  describe('skip', () => {
    const anonUser = { email: '', isAnonymous: true }

    beforeEach(() => {
      vi.mocked(authApi.anonymous).mockResolvedValue(undefined)
      vi.mocked(authApi.refreshSession).mockResolvedValue(anonUser)
    })

    it('calls authApi.anonymous with device ID and sets user from refreshSession', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('skip-btn'))
      })

      expect(authApi.anonymous).toHaveBeenCalledWith('device-123')
      expect(localStorage.getItem('aaharya_has_session')).toBe('true')
      await waitFor(() => expect(screen.getByTestId('anonymous')).toHaveTextContent('anonymous'))
    })

    it('syncs pending limit if present when skipping', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      vi.mocked(settingsApi.saveSettings).mockResolvedValue({ currentMonthlyLimit: 10 })

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('skip-btn'))
      })

      await waitFor(() => {
        expect(settingsApi.saveSettings).toHaveBeenCalledWith(10)
      })
      expect(localStorage.getItem('aaharya_pending_limit')).toBeNull()
    })

    it('logs raw rejection when saveSettings fails with non-Error during skip', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      vi.mocked(settingsApi.saveSettings).mockRejectedValue('quota exceeded')
      vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      await act(async () => {
        await userEvent.click(screen.getByTestId('skip-btn'))
      })
      await waitFor(() => expect(screen.getByTestId('anonymous')).toHaveTextContent('anonymous'))

      expect(console.error).toHaveBeenCalledWith(
        '[auth] skip: failed to save pending limit:',
        'quota exceeded'
      )
      vi.mocked(console.error).mockRestore()
    })

    it('handles saveSettings failure gracefully when skipping', async () => {
      localStorage.setItem('aaharya_pending_limit', '10')
      vi.mocked(settingsApi.saveSettings).mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('skip-btn'))
      })

      await waitFor(() => {
        expect(settingsApi.saveSettings).toHaveBeenCalledWith(10)
      })
      await waitFor(() => expect(screen.getByTestId('anonymous')).toHaveTextContent('anonymous'))
    })

    it('does not call saveSettings if no pending limit', async () => {
      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await userEvent.click(screen.getByTestId('skip-btn'))
      })

      expect(settingsApi.saveSettings).not.toHaveBeenCalled()
    })
  })

  describe('anonymous session restore', () => {
    it('auto-restores anonymous session when SESSION_TYPE is anonymous and refresh fails', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      localStorage.setItem('aaharya_session_type', 'anonymous')
      const anonUser = { email: '', isAnonymous: true }
      vi.mocked(authApi.refreshSession)
        .mockResolvedValueOnce(null) // initial refresh fails
        .mockResolvedValue(anonUser) // restore succeeds
      vi.mocked(authApi.anonymous).mockResolvedValue(undefined)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('anonymous')).toHaveTextContent('anonymous'))
      expect(authApi.anonymous).toHaveBeenCalled()
    })

    it('logs raw rejection value when anonymous restore fails with non-Error', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      localStorage.setItem('aaharya_session_type', 'anonymous')
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)
      vi.mocked(authApi.anonymous).mockRejectedValue('network unavailable')
      vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'))

      expect(console.error).toHaveBeenCalledWith(
        '[auth] anonymous auto-restore failed:',
        'network unavailable'
      )
      vi.mocked(console.error).mockRestore()
    })

    it('shows null user when anonymous restore also fails', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      localStorage.setItem('aaharya_session_type', 'anonymous')
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)
      vi.mocked(authApi.anonymous).mockRejectedValue(new Error('Network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'))
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged out')
    })

    it('handles unexpected refreshSession throw gracefully', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      vi.mocked(authApi.refreshSession).mockRejectedValue(new Error('Unexpected network error'))

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('ready'))
      expect(screen.getByTestId('logged-in')).toHaveTextContent('logged out')
    })

    it('does not set HAS_ACCOUNT when restored user is anonymous', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      const anonUser = { email: '', isAnonymous: true }
      vi.mocked(authApi.refreshSession).mockResolvedValue(anonUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => expect(screen.getByTestId('anonymous')).toHaveTextContent('anonymous'))
      expect(localStorage.getItem('aaharya_has_account')).toBeNull()
    })
  })

  describe('background refresh', () => {
    afterEach(() => vi.useRealTimers())

    it('updates user when background refresh succeeds', async () => {
      vi.useFakeTimers()
      localStorage.setItem('aaharya_has_session', 'true')
      const initialUser = { email: 'user@example.com' }
      const refreshedUser = { email: 'user@example.com', isAnonymous: false }
      vi.mocked(authApi.refreshSession)
        .mockResolvedValueOnce(initialUser)
        .mockResolvedValue(refreshedUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Let initial mount effect run
      await act(async () => {
        await Promise.resolve()
      })

      // Advance interval and let callback run
      await act(async () => {
        vi.advanceTimersByTime(14 * 60 * 1000)
        await Promise.resolve()
        await Promise.resolve()
      })

      expect(screen.getByTestId('user')).toHaveTextContent('user@example.com')
    })

    it('does not clear user when background refresh returns null', async () => {
      vi.useFakeTimers()
      localStorage.setItem('aaharya_has_session', 'true')
      const initialUser = { email: 'user@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValueOnce(initialUser).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await act(async () => {
        await Promise.resolve()
      })

      await act(async () => {
        vi.advanceTimersByTime(14 * 60 * 1000)
        await Promise.resolve()
        await Promise.resolve()
      })

      // User should still be set (null refresh doesn't clear user)
      expect(screen.getByTestId('user')).toHaveTextContent('user@example.com')
    })
  })

  describe('skip error path', () => {
    it('clears session keys when refreshSession returns null after anonymous creation', async () => {
      vi.mocked(authApi.anonymous).mockResolvedValue(undefined)
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)
      // Suppress the unhandled rejection from skip() throwing
      const suppressError = vi.spyOn(console, 'error').mockImplementation(() => {})

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      // Directly invoke skip via the button's underlying handler
      const skipPromise = screen.getByTestId('skip-btn').click() as unknown as Promise<void>
      await act(async () => {
        await Promise.allSettled([skipPromise, new Promise((r) => setTimeout(r, 50))])
      })

      suppressError.mockRestore()
      expect(localStorage.getItem('aaharya_has_session')).toBeNull()
      expect(localStorage.getItem('aaharya_session_type')).toBeNull()
    })
  })

  describe('isLoggedIn and isLoading derived state', () => {
    it('isLoggedIn is false when user is null', async () => {
      vi.mocked(authApi.refreshSession).mockResolvedValue(null)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('logged-in')).toHaveTextContent('logged out')
      })
    })

    it('isLoggedIn is true when user is set', async () => {
      localStorage.setItem('aaharya_has_session', 'true')
      const mockUser = { email: 'user@example.com' }
      vi.mocked(authApi.refreshSession).mockResolvedValue(mockUser)

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('logged-in')).toHaveTextContent('logged in')
      })
    })
  })
})
