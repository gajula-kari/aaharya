import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

vi.mock('../hooks/useAuthContext')
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>()
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) }
})

import { useAuthContext } from '../hooks/useAuthContext'

function renderLogin() {
  return render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>
  )
}

describe('Login page', () => {
  const mockLogin = vi.fn()
  const mockRegister = vi.fn()
  const mockSkip = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthContext).mockReturnValue({
      user: null,
      isLoggedIn: false,
      isSkipped: false,
      isLoading: false,
      login: mockLogin,
      register: mockRegister,
      logout: vi.fn(),
      skip: mockSkip,
      unSkip: vi.fn(),
    })
  })

  describe('header and branding', () => {
    it('renders the aaharya logo and subtitle', () => {
      renderLogin()
      expect(screen.getByAltText('Aaharya')).toBeInTheDocument()
      expect(screen.getByText('aaharya')).toBeInTheDocument()
      expect(screen.getByText('sign in to sync your data')).toBeInTheDocument()
    })

    it('shows signup subtitle when in signup mode', async () => {
      renderLogin()
      const signUpButton = screen.getByRole('button', { name: /Sign up/i })
      await userEvent.click(signUpButton)
      expect(screen.getByText('create an account to sync your data')).toBeInTheDocument()
    })
  })

  describe('google oauth', () => {
    it('renders google continue button with correct href', () => {
      renderLogin()
      const googleButton = screen.getByRole('link', { name: /Continue with Google/i })
      expect(googleButton).toHaveAttribute('href', '/auth/google')
    })
  })

  describe('sign in mode', () => {
    it('renders email and password inputs', () => {
      renderLogin()
      expect(screen.getByPlaceholderText('you@example.com')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    })

    it('does not render confirm password input in sign in mode', () => {
      renderLogin()
      const passwordInputs = screen.getAllByPlaceholderText('••••••••')
      expect(passwordInputs).toHaveLength(1)
    })

    it('calls login with email and password on submit', async () => {
      mockLogin.mockResolvedValue({ email: 'test@example.com', displayName: 'Test' })
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password123')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      })
    })

    it('shows email error for EMAIL_NOT_FOUND', async () => {
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_FOUND'))
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(
        await screen.findByText('No account found. Try signing up instead.')
      ).toBeInTheDocument()
    })

    it('shows password error for incorrect password', async () => {
      mockLogin.mockRejectedValue(new Error('Incorrect password'))
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'wrongpass')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(await screen.findByText('Incorrect password')).toBeInTheDocument()
    })
  })

  describe('sign up mode', () => {
    beforeEach(async () => {
      renderLogin()
      const signUpButton = screen.getByRole('button', { name: /Sign up/i })
      await userEvent.click(signUpButton)
    })

    it('renders confirm password input in sign up mode', () => {
      const passwordInputs = screen.getAllByPlaceholderText('••••••••')
      expect(passwordInputs).toHaveLength(2)
    })

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      const inputs = screen.getAllByPlaceholderText('••••••••')
      await user.type(inputs[0], 'password123')
      await user.type(inputs[1], 'password456')
      await user.click(screen.getByRole('button', { name: 'Continue' }))

      expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    })

    it('calls register with email, password and displayName on submit', async () => {
      mockRegister.mockResolvedValue({ email: 'test@example.com', displayName: 'test' })
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      const inputs = screen.getAllByPlaceholderText('••••••••')
      await user.type(inputs[0], 'password123')
      await user.type(inputs[1], 'password123')
      await user.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123', 'test')
      })
    })

    it('shows error when email already exists', async () => {
      mockRegister.mockRejectedValue(new Error('An account with this email already exists'))
      const user = userEvent.setup()
      await user.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      const inputs = screen.getAllByPlaceholderText('••••••••')
      await user.type(inputs[0], 'password123')
      await user.type(inputs[1], 'password123')
      await user.click(screen.getByRole('button', { name: 'Continue' }))

      expect(
        await screen.findByText('An account with this email already exists')
      ).toBeInTheDocument()
    })
  })

  describe('password visibility toggle', () => {
    it('toggles password visibility', async () => {
      renderLogin()
      const passwordInput = screen.getByPlaceholderText('••••••••') as HTMLInputElement
      const eyeButton = screen.getByLabelText('Show password')

      expect(passwordInput.type).toBe('password')
      await userEvent.click(eyeButton)
      expect(passwordInput.type).toBe('text')
      await userEvent.click(eyeButton)
      expect(passwordInput.type).toBe('password')
    })

    it('toggles label between show and hide', async () => {
      renderLogin()
      expect(screen.getByLabelText('Show password')).toBeInTheDocument()
      await userEvent.click(screen.getByLabelText('Show password'))
      expect(screen.getByLabelText('Hide password')).toBeInTheDocument()
    })
  })

  describe('mode switching', () => {
    it('switches from sign in to sign up', async () => {
      renderLogin()
      expect(screen.getByText('sign in to sync your data')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))
      expect(screen.getByText('create an account to sync your data')).toBeInTheDocument()
    })

    it('switches from sign up to sign in', async () => {
      renderLogin()
      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))
      expect(screen.getByText('create an account to sync your data')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: /Sign in/i }))
      expect(screen.getByText('sign in to sync your data')).toBeInTheDocument()
    })

    it('clears errors when switching modes', async () => {
      mockLogin.mockRejectedValue(new Error('EMAIL_NOT_FOUND'))
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(
        await screen.findByText('No account found. Try signing up instead.')
      ).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))
      expect(
        screen.queryByText('No account found. Try signing up instead.')
      ).not.toBeInTheDocument()
    })

    it('clears confirm password when switching to sign in', async () => {
      renderLogin()
      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))

      const inputs = screen.getAllByPlaceholderText('••••••••')
      await userEvent.type(inputs[1], 'testpass')
      expect((inputs[1] as HTMLInputElement).value).toBe('testpass')

      await userEvent.click(screen.getByRole('button', { name: /Sign in/i }))
      expect(screen.queryByText('Confirm Password')).not.toBeInTheDocument()
    })
  })

  describe('skip for now', () => {
    it('calls skip function when skip button is clicked', async () => {
      renderLogin()
      const skipButton = screen.getByRole('button', { name: /Skip for now/i })
      await userEvent.click(skipButton)
      expect(mockSkip).toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('disables submit button and shows spinner during login', async () => {
      let resolveLogin: ((value: { email: string; displayName: string }) => void) | null = null
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve
      })
      mockLogin.mockReturnValue(loginPromise)

      renderLogin()
      const submitButton = screen.getByRole('button', { name: 'Continue' })

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(submitButton)

      expect(screen.getByRole('button', { name: /Signing in/i })).toBeDisabled()
      expect(screen.getByText('Signing in')).toBeInTheDocument()

      resolveLogin!({ email: 'test@example.com', displayName: 'Test' })
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
      })
    })

    it('shows "Creating account" during sign up', async () => {
      let resolveRegister: ((value?: void) => void) | undefined
      const registerPromise = new Promise<void>((resolve) => {
        resolveRegister = resolve
      })
      mockRegister.mockReturnValue(registerPromise)

      renderLogin()
      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))

      const inputs = screen.getAllByPlaceholderText('••••••••')
      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(inputs[0], 'password123')
      await userEvent.type(inputs[1], 'password123')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(screen.getByText('Creating account')).toBeInTheDocument()

      resolveRegister?.()
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Continue' })).not.toBeDisabled()
      })
    })
  })

  describe('generic error handling', () => {
    it('shows generic error message for unknown errors', async () => {
      mockLogin.mockRejectedValue(new Error('Some unexpected error'))
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(await screen.findByText('Some unexpected error')).toBeInTheDocument()
    })

    it('shows fallback message for errors without message', async () => {
      mockLogin.mockRejectedValue({})
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'test@example.com')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      expect(await screen.findByText('Something went wrong. Try again.')).toBeInTheDocument()
    })
  })

  describe('email trimming', () => {
    it('trims email before submitting', async () => {
      mockLogin.mockResolvedValue({ email: 'test@example.com', displayName: 'Test' })
      renderLogin()

      await userEvent.type(screen.getByPlaceholderText('you@example.com'), '  test@example.com  ')
      await userEvent.type(screen.getByPlaceholderText('••••••••'), 'password')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password')
      })
    })
  })

  describe('sign up displayName extraction', () => {
    it('extracts displayName from email before @', async () => {
      mockRegister.mockResolvedValue({ email: 'john.doe@example.com', displayName: 'john.doe' })
      renderLogin()

      await userEvent.click(screen.getByRole('button', { name: /Sign up/i }))
      const inputs = screen.getAllByPlaceholderText('••••••••')
      await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'john.doe@example.com')
      await userEvent.type(inputs[0], 'password123')
      await userEvent.type(inputs[1], 'password123')
      await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

      await waitFor(() => {
        expect(mockRegister).toHaveBeenCalledWith('john.doe@example.com', 'password123', 'john.doe')
      })
    })
  })

  describe('form prevention', () => {
    it('prevents default form submission', async () => {
      mockLogin.mockResolvedValue({ email: 'test@example.com', displayName: 'Test' })
      renderLogin()

      const form = screen.getByRole('button', { name: 'Continue' }).closest('form')
      expect(form).toHaveAttribute('novalidate')
    })
  })
})
