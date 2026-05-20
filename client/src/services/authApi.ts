const ROOT = import.meta.env.VITE_API_URL ?? ''
const BASE = `${ROOT}/auth`

export interface AuthUser {
  email: string
  displayName: string
}

async function request(url: string, options: RequestInit = {}): Promise<unknown> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = (await res.json()) as { error?: string }
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export async function register(
  email: string,
  password: string,
  displayName: string
): Promise<AuthUser> {
  const data = (await request(`${BASE}/register`, {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  })) as { user: AuthUser }
  return data.user
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = (await request(`${BASE}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })) as { user: AuthUser }
  return data.user
}

export async function logout(): Promise<void> {
  await request(`${BASE}/logout`, { method: 'POST' })
}

export async function refreshSession(): Promise<AuthUser | null> {
  try {
    await request(`${BASE}/refresh`, { method: 'POST' })
    const data = (await request(`${BASE}/me`)) as { user: AuthUser }
    return data.user
  } catch {
    return null
  }
}
