import type { Settings } from '../types'

const ROOT = import.meta.env.VITE_API_URL ?? ''
const BASE = `${ROOT}/settings`

async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  let data: { error?: string } = {}
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text) as { error?: string }
    } catch {
      console.error(
        '[settingsApi] non-JSON response from',
        url,
        'status:',
        res.status,
        'body:',
        text.slice(0, 100)
      )
    }
  }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function fetchSettings(): Promise<Settings | null> {
  const data = (await request(BASE)) as { settings: Settings | null }
  return data.settings
}

export async function saveSettings(currentMonthlyLimit: number): Promise<Settings> {
  const data = (await request(BASE, {
    method: 'PATCH',
    body: JSON.stringify({ currentMonthlyLimit }),
  })) as { settings: Settings }
  return data.settings
}
