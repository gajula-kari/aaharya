import { createContext } from 'react'
import type { AuthUser } from '../services/authApi'

export interface AuthContextValue {
  user: AuthUser | null
  isLoggedIn: boolean
  isSkipped: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName: string) => Promise<void>
  logout: () => Promise<void>
  skip: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
