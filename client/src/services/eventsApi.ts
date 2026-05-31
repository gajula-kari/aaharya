export type InstallEvent = 'banner_shown' | 'banner_dismissed' | 'standalone_visit'

const ROOT = import.meta.env.VITE_API_URL ?? ''

export function logEvent(event: InstallEvent): void {
  void fetch(`${ROOT}/events`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event }),
  })
    .then((res) => {
      if (!res.ok)
        console.error('[eventsApi] logEvent failed, status:', res.status, 'event:', event)
    })
    .catch((err: unknown) => {
      console.error('[eventsApi] logEvent network error:', err instanceof Error ? err.message : err)
    })
}
