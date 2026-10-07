export function elapsedMinutes(since: number, now = Date.now()): number {
  return Math.max(0, Math.floor((now - since) / 60000))
}

export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// 카드를 만든 뒤 지금까지 총 경과 시간(분). 카드가 좁아서 1시간이 넘어도 분 단위로만 보여 준다.
export const formatTotal = (since: number, now = Date.now()): string => `${elapsedMinutes(since, now)}분`
