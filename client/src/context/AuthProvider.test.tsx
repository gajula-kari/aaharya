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
  const { user, isLoggedIn, isAnonymous, isLoading, login, register, logout, skip } =
    useAuthContext()
  return (
    <div>
      <span data-testid="user">{user?.email ?? 'no user'}</span>
      <span data-testid="logged-in">{isLoggedIn ? 'logged in' : 'logged out'}</span>
      <span data-testid="anonymous">{isAnonymous ? 'anonymous' : 'not anonymous'}</span>
      <span data-testid="loading">{isLoading ? 'loading' : 'ready'}</span>

      <button onClick={() => login('test@example.com', 'password')} data-testid="login-btn">
        Login
      </button>
      <button onClick={() => register('test@example.com', 'password')} data-testid="register-btn">
        Register
      </button>
      <button onClick={() => logout()} data-testid="logout-btn">
        Logout
      </button>
      <button onClick={() => skip()} data-testid="skip-btn">
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
