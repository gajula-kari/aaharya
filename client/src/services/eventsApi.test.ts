import * as eventsApi from './eventsApi'

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('eventsApi', () => {
  describe('logEvent', () => {
    it('sends banner_shown event with credentials and no x-user-id', () => {
      eventsApi.logEvent('banner_shown')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'banner_shown' }),
        })
      )
    })

    it('sends banner_dismissed event', () => {
      eventsApi.logEvent('banner_dismissed')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({ body: JSON.stringify({ event: 'banner_dismissed' }) })
      )
    })

    it('sends standalone_visit event', () => {
      eventsApi.logEvent('standalone_visit')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({ body: JSON.stringify({ event: 'standalone_visit' }) })
      )
    })
  })
})
