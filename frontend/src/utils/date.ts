export function getTodayISODate(): string {
  const now = new Date()
  return toISODate(now.toISOString())
}

export function toISODate(value: string): string {
  // Normalise any date/time string to YYYY-MM-DD
  const d = new Date(value)
  const year = d.getFullYear()
  const month = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isSameDate(a: string, b: string): boolean {
  return toISODate(a) === toISODate(b)
}

export function format(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

