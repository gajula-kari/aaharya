import { getDeviceId } from '../utils/deviceId'

export type InstallEvent =
  | 'install_clicked'
  | 'app_installed'
  | 'standalone_visit'
  | 'ios_banner_shown'
  | 'ios_banner_dismissed'

const ROOT = import.meta.env.VITE_API_URL ?? ''

export function logEvent(event: InstallEvent): void {
  void fetch(`${ROOT}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-user-id': getDeviceId() },
    body: JSON.stringify({ event }),
  })
}
