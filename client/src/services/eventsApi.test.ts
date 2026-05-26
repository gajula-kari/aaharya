import * as eventsApi from './eventsApi'
import * as deviceId from '../utils/deviceId'

vi.mock('../utils/deviceId')
vi.stubGlobal('fetch', vi.fn())

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(deviceId.getDeviceId).mockReturnValue('device-123')
})

describe('eventsApi', () => {
  describe('logEvent', () => {
    it('sends install_clicked event', () => {
      eventsApi.logEvent('install_clicked')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'device-123',
          },
          body: JSON.stringify({ event: 'install_clicked' }),
        })
      )
    })

    it('sends app_installed event', () => {
      eventsApi.logEvent('app_installed')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'device-123',
          },
          body: JSON.stringify({ event: 'app_installed' }),
        })
      )
    })

    it('sends standalone_visit event', () => {
      eventsApi.logEvent('standalone_visit')

      expect(fetch).toHaveBeenCalledWith(
        '/events',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'device-123',
          },
          body: JSON.stringify({ event: 'standalone_visit' }),
        })
      )
    })

    it('includes device id from getDeviceId', () => {
      vi.mocked(deviceId.getDeviceId).mockReturnValue('custom-device-id')

      eventsApi.logEvent('install_clicked')

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-user-id': 'custom-device-id',
          }),
        })
      )
    })
  })
})
