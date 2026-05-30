export type InstallEvent = 'banner_shown' | 'banner_dismissed' | 'standalone_visit'

const ROOT = import.meta.env.VITE_API_URL ?? ''

export function logEvent(event: InstallEvent): void {
  void fetch(`${ROOT}/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  })
}
