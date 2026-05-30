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
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  })
}
