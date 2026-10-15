import type { AdCost, Entry, NewEntry } from '../inquiries'
import { localDate } from '../inquiries'
import { addMonths } from './stats'

// 화면 확인용 가상 데이터 (실제 환자 아님). 최근 6개월치 문의·상담·시술 카드를 만든다. 매번 같은 결과가 나오도록 간단한 난수를 쓴다.
export function sampleData(): { entries: Entry[]; adCosts: AdCost[] } {
  let seed = 11
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const pick = <T,>(xs: [T, number][]): T => {
    const total = xs.reduce((s, [, w]) => s + w, 0)
    let r = rnd() * total
    for (const [x, w] of xs) if ((r -= w) < 0) return x
    return xs[0][0]
  }
  const today = localDate()
  const plus = (d: string, n: number) => localDate(new Date(new Date(`${d}T00:00:00`).getTime() + n * 86400000))
  const start = `${addMonths(today.slice(0, 7), -5)}-01`
  const out: NewEntry[] = []
  const blank = { channel: '', amount: null, patientName: '', note: '' }

  for (let d = start; d <= today; d = plus(d, 1)) {
    const n = Math.round(1 + rnd() * 3) // 하루 문의 1~4명
    for (let k = 0; k < n; k++) {
      const nationality = pick([['한국', 55], ['일본', 25], ['미국', 6], ['캐나다', 2], ['호주', 3], ['대만', 3], ['홍콩', 2], ['중국', 2], ['기타', 2]])
      const foreign = nationality !== '한국'
      const source = foreign
        ? pick([['인스타', 30], ['구글검색', 20], ['유튜브', 15], ['스레드', 10], ['소개', 15], ['AI', 10]])
        : pick([['강남언니', 20], ['인터넷', 18], ['인스타', 15], ['소개', 12], ['구환', 10], ['미뷰', 7], ['메이비', 5], ['카페', 5], ['유튜브', 5], ['모름', 3]])
      const channel = foreign
        ? pick([['해외에이전시', 45], ['인스타DM', 35], ['홈페이지', 20]])
        : source === '강남언니' ? pick([['강남언니', 70], ['카카오채널', 30]])
        : source === '미뷰' ? '미뷰'
        : source === '메이비' ? '메이비'
        : pick([['카카오채널', 45], ['인콜', 25], ['네이버예약', 20], ['인스타DM', 10]])
      const interest =
        nationality === '일본'
          ? pick([['실리프팅', 70], ['필러 및 스킨부스터', 30]])
          : pick([['실리프팅', 20], ['미니거상', 12], ['안면거상', 13], ['처진눈성형', 15], ['눈밑지방재배치', 12], ['눈성형', 5], ['필러 및 스킨부스터', 15], ['코성형', 3], ['안면윤곽', 2], ['지방이식', 3]])
      const base = { ...blank, source, nationality, interest }
      out.push({ ...base, kind: 'inquiry', date: d, channel })
      // 소개·구환은 상담·시술까지 잘 이어진다고 가정 (화면 확인용)
      const warm = source === '소개' || source === '구환' ? 0.2 : 0
      if (rnd() < 0.45 + warm) {
        const consultDay = plus(d, Math.floor(rnd() * 6))
        if (consultDay > today) continue
        out.push({ ...base, kind: 'consult', date: consultDay })
        if (rnd() < 0.45 + warm) {
          const big = !['실리프팅', '필러 및 스킨부스터'].includes(interest)
          const day = big ? plus(consultDay, 7 + Math.floor(rnd() * 25)) : consultDay
          if (day > today) continue
          out.push({ ...base, kind: 'treatment', date: day, amount: Math.round((big ? 400 + rnd() * 900 : 40 + rnd() * 260) / 10) * 10 })
        }
      }
    }
    if (rnd() < 0.15) out.push({ ...blank, kind: 'inquiry', date: d, source: '워크인', channel: '', nationality: '한국', interest: '필러 및 스킨부스터' }, { ...blank, kind: 'consult', date: d, source: '워크인', nationality: '한국', interest: '필러 및 스킨부스터' })
  }
  const entries: Entry[] = out.map((e, k) => ({ ...e, id: `sample-${k}`, createdAt: k })).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
  const adCosts: AdCost[] = []
  for (let back = 5; back >= 0; back--) {
    const month = addMonths(today.slice(0, 7), -back)
    adCosts.push({ month, source: '강남언니', amount: 300 }, { month, source: '인스타', amount: 250 }, { month, source: '인터넷', amount: 200 }, { month, source: '미뷰', amount: 100 })
  }
  return { entries, adCosts }
}
