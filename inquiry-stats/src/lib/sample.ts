import type { AdCost, Inquiry, Stage } from '../inquiries'
import { localDate } from '../inquiries'
import { addMonths } from './stats'

// 화면 확인용 가상 데이터 (실제 환자 아님). 최근 6개월치를 만든다. 매번 같은 결과가 나오도록 간단한 난수를 쓴다.
export function sampleData(): { inquiries: Inquiry[]; adCosts: AdCost[] } {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  const pick = <T,>(xs: [T, number][]): T => {
    const total = xs.reduce((s, [, w]) => s + w, 0)
    let r = rnd() * total
    for (const [x, w] of xs) if ((r -= w) < 0) return x
    return xs[0][0]
  }
  const today = localDate()
  const thisMonth = today.slice(0, 7)
  const inquiries: Inquiry[] = []
  for (let back = 5; back >= 0; back--) {
    const m = addMonths(thisMonth, -back)
    const days = back === 0 ? Number(today.slice(8)) : 28
    const n = Math.round(days * (0.9 + rnd() * 0.5))
    for (let k = 0; k < n; k++) {
      const day = String(1 + Math.floor(rnd() * days)).padStart(2, '0')
      const nationality = pick([['한국', 55], ['일본', 25], ['미국·캐나다', 8], ['호주·뉴질랜드', 4], ['대만·홍콩', 5], ['기타', 3]])
      const foreign = nationality !== '한국'
      const source = foreign
        ? pick([['인스타', 30], ['구글검색', 20], ['유튜브', 15], ['스레드', 10], ['소개', 15], ['AI', 10]])
        : pick([['강남언니', 20], ['인터넷', 18], ['인스타', 15], ['소개', 12], ['구환', 10], ['미뷰', 7], ['메이비', 5], ['카페', 5], ['유튜브', 5], ['스레드', 3]])
      const channel = foreign
        ? pick([['해외에이전시', 45], ['인스타DM', 35], ['홈페이지', 20]])
        : source === '강남언니' ? pick([['강남언니', 70], ['카카오채널', 30]])
        : source === '미뷰' ? '미뷰'
        : source === '메이비' ? '메이비'
        : pick([['카카오채널', 45], ['인콜', 25], ['네이버예약', 20], ['인스타DM', 10]])
      const interest =
        nationality === '일본'
          ? pick([['실리프팅', 70], ['스킨부스터', 15], ['필러', 15]])
          : pick([['실리프팅', 20], ['미니거상', 15], ['안면거상', 10], ['상안검(눈처짐)', 15], ['하안검·눈밑지방재배치', 12], ['필러', 10], ['스킨부스터', 10], ['목거상·이중턱', 8]])
      // 소개·재방문은 결제까지 잘 이어지고, 광고성 경로는 덜 이어진다 (화면 확인용 가정)
      const warm = source === '소개' || source === '구환' ? 0.25 : channel === '해외에이전시' ? 0.1 : 0
      const r = rnd() - warm
      const stage: Stage = r < 0.25 ? 'paid' : r < 0.4 ? 'visited' : r < 0.6 ? 'booked' : 'inquiry'
      const big = ['미니거상', '안면거상', '목거상·이중턱', '상안검(눈처짐)', '하안검·눈밑지방재배치'].includes(interest)
      const amount = stage === 'paid' ? Math.round((big ? 400 + rnd() * 900 : 40 + rnd() * 260) / 10) * 10 : null
      inquiries.push({
        id: `sample-${m}-${k}`,
        date: `${m}-${day}`,
        channel,
        source,
        campaign: source === '인스타' && rnd() < 0.4 ? `${Number(m.slice(5))}월 인스타 실리프팅` : '',
        nationality,
        interest,
        stage,
        amount,
        paidDate: stage === 'paid' ? `${m}-${day}` : null,
        note: '예시',
        staff: pick([['유빈', 50], ['도은', 35], ['정실장', 15]]),
        createdAt: k,
      })
    }
  }
  inquiries.sort((a, b) => b.date.localeCompare(a.date))
  const adCosts: AdCost[] = []
  for (let back = 5; back >= 0; back--) {
    const month = addMonths(thisMonth, -back)
    adCosts.push({ month, source: '강남언니', amount: 300 }, { month, source: '인스타', amount: 250 }, { month, source: '인터넷', amount: 200 }, { month, source: '미뷰', amount: 100 })
  }
  return { inquiries, adCosts }
}
