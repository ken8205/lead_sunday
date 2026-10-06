export function elapsedMinutes(since: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - since) / 60000))
}

export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
