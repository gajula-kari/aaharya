export function formatTimeDisplay(time: string): string {
  const [hh, mm] = time.split(':').map(Number)
  const d = new Date()
  d.setHours(hh, mm, 0, 0)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function formatDateLabel(date: Date, includeTime: boolean): string {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  if (!includeTime) return dateStr
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  return `${dateStr} · ${timeStr}`
}

export function formatLocalDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
