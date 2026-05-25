import { renderHook } from '@testing-library/react'
import { useMealContext } from './useMealContext'

describe('useMealContext', () => {
  it('throws error when used outside MealProvider', () => {
    expect(() => {
      renderHook(() => useMealContext())
    }).toThrow('useMealContext must be used within MealProvider')
  })
})
