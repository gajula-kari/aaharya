import * as eventsApi from './eventsApi'

vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 201 }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(fetch).mockResolvedValue({ ok: true, status: 201 } as Response)
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

    it('does not log error on successful response', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      eventsApi.logEvent('banner_shown')
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(console.error).not.toHaveBeenCalled()
      vi.mocked(console.error).mockRestore()
    })

    it('logs error when server responds with non-ok status', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(fetch).mockResolvedValueOnce({ ok: false, status: 400 } as Response)

      eventsApi.logEvent('banner_shown')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(console.error).toHaveBeenCalledWith(
        '[eventsApi] logEvent failed, status:',
        expect.anything(),
        'event:',
        expect.any(String)
      )
      vi.mocked(console.error).mockRestore()
    })

    it('logs error on network failure with Error instance', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

      eventsApi.logEvent('banner_shown')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(console.error).toHaveBeenCalledWith(
        '[eventsApi] logEvent network error:',
        'Network error'
      )
      vi.mocked(console.error).mockRestore()
    })

    it('logs raw value on network failure with non-Error rejection', async () => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.mocked(fetch).mockRejectedValueOnce('connection refused')

      eventsApi.logEvent('banner_shown')
      await new Promise((resolve) => setTimeout(resolve, 0))

      expect(console.error).toHaveBeenCalledWith(
        '[eventsApi] logEvent network error:',
        'connection refused'
      )
      vi.mocked(console.error).mockRestore()
    })
  })
})
