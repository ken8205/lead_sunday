export function elapsedMinutes(since: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - since) / 60000))
}
