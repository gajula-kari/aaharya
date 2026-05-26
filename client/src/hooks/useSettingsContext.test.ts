import { renderHook } from '@testing-library/react'
import { useSettingsContext } from './useSettingsContext'

describe('useSettingsContext', () => {
  it('throws error when used outside SettingsProvider', () => {
    expect(() => {
      renderHook(() => useSettingsContext())
    }).toThrow('useSettingsContext must be used within SettingsProvider')
  })
})
