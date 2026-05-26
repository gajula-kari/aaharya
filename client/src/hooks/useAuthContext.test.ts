import { renderHook } from '@testing-library/react'
import { useAuthContext } from './useAuthContext'

describe('useAuthContext', () => {
  it('throws error when used outside AuthProvider', () => {
    expect(() => {
      renderHook(() => useAuthContext())
    }).toThrow('useAuthContext must be used within AuthProvider')
  })
})
