import { useCallback, useEffect, useState } from 'react'

// 주소 뒤 # 부분으로 화면을 나눈다. 통계 화면과 기간이 주소에 들어가므로, 직원끼리 링크로 같은 화면을 공유할 수 있다.
//   #/ledger
//   #/stats?from=2026-08&to=2026-10&gran=month
//   #/stats/source/네이버%20검색?from=…   (항목 상세)
export interface Route {
  path: string[] // 예: ['stats', 'source', '네이버 검색']
  query: Record<string, string>
}

function parse(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '')
  const [p, q = ''] = raw.split('?')
  return {
    path: p.split('/').filter(Boolean).map(decodeURIComponent),
    query: Object.fromEntries(new URLSearchParams(q)),
  }
}

export function buildHash(path: string[], query: Record<string, string | undefined> = {}): string {
  const q = new URLSearchParams(Object.entries(query).filter((e): e is [string, string] => !!e[1])).toString()
  return `#/${path.map(encodeURIComponent).join('/')}${q ? `?${q}` : ''}`
}

export function useHashRoute() {
  const [route, setRoute] = useState(parse)
  useEffect(() => {
    const on = () => setRoute(parse())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  // replace: 기간만 바꿀 때는 뒤로 가기 기록을 쌓지 않는다
  const go = useCallback((hash: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', hash)
      setRoute(parse())
    } else window.location.hash = hash
  }, [])
  return { route, go }
}
