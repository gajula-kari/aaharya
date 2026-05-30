import * as eventsApi from './eventsApi'

vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
})

describe('eventsApi', () => {
  describe('logEvent', () => {
    it('sends install_clicked event with credentials and no x-user-id', () => {
      eventsApi.logEvent('install_clicked')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'install_clicked' }),
        })
      )
    })

    it('sends app_installed event', () => {
      eventsApi.logEvent('app_installed')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({ body: JSON.stringify({ event: 'app_installed' }) })
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
