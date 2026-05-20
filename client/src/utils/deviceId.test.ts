import { getDeviceId } from './deviceId'

beforeEach(() => {
  localStorage.clear()
})

describe('getDeviceId', () => {
  it('generates and stores a new UUID when none exists', () => {
    const id = getDeviceId()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(localStorage.getItem('aaharya_device_id')).toBe(id)
  })

  it('returns the same ID on subsequent calls', () => {
    const id1 = getDeviceId()
    const id2 = getDeviceId()
    expect(id1).toBe(id2)
  })

  it('returns the existing stored ID', () => {
    localStorage.setItem('aaharya_device_id', 'existing-id')
    expect(getDeviceId()).toBe('existing-id')
  })

  it('uses the getRandomValues fallback when randomUUID is unavailable', () => {
    const original = crypto.randomUUID
    // @ts-expect-error intentionally removing the method to test fallback
    crypto.randomUUID = undefined
    try {
      const id = getDeviceId()
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    } finally {
      crypto.randomUUID = original
    }
  })
})
