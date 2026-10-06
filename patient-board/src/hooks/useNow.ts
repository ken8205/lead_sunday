import { useEffect, useState } from 'react'

// 경과 시간 표시를 주기적으로 갱신한다.
export function useNow(intervalMs = 30000): number {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}
