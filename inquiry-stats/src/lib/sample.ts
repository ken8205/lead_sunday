import type { AdCost, Inquiry, Stage } from '../inquiries'
import { localDate, stageFieldsFor } from '../inquiries'
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
      const nationality = pick([['한국', 55], ['일본', 25], ['미국', 6], ['캐나다', 2], ['호주', 3], ['뉴질랜드', 1], ['대만', 3], ['홍콩', 2], ['기타', 3]])
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
          ? pick([['실리프팅', 70], ['필러 및 스킨부스터', 30]])
          : pick([['실리프팅', 20], ['미니거상', 12], ['안면거상', 13], ['처진눈성형', 15], ['눈밑지방재배치', 12], ['눈성형', 5], ['필러 및 스킨부스터', 15], ['코성형', 3], ['안면윤곽', 2], ['지방이식', 3]])
      // 소개·재방문은 결제까지 잘 이어지고, 광고성 경로는 덜 이어진다 (화면 확인용 가정)
      const warm = source === '소개' || source === '구환' ? 0.25 : channel === '해외에이전시' ? 0.1 : 0
      const r = rnd() - warm
      const big = ['미니거상', '안면거상', '처진눈성형', '눈밑지방재배치', '눈성형', '코성형', '안면윤곽', '지방이식'].includes(interest)
      const date = `${m}-${day}`
      const plus = (d: string, n: number) => localDate(new Date(new Date(`${d}T00:00:00`).getTime() + n * 86400000))
      let stage: Stage = r < 0.3 ? 'visited' : r < 0.5 ? 'booked' : r < 0.75 ? 'inquiry' : 'visited'
      let amount: number | null = null
      let depositAmount: number | null = null
      let depositDate: string | null = null
      let paidDate: string | null = null
      let canceledDate: string | null = null
      let refundAmount: number | null = null
      let surgeryDate: string | null = null
      const consultDay = plus(date, Math.floor(rnd() * 4))
      const consultAt = `${consultDay}T${pick([['10:00', 1], ['11:30', 1], ['14:00', 1], ['15:30', 1], ['17:00', 1]])}`
      if (r < 0.25) {
        amount = Math.round((big ? 400 + rnd() * 900 : 40 + rnd() * 260) / 10) * 10
        const consult = plus(date, Math.floor(rnd() * 5))
        if (!big) {
          stage = 'paid' // 시술: 당일 상담·당일 전액
          paidDate = consult
        } else {
          depositAmount = Math.round(amount * 0.1)
          depositDate = consult
          const surgery = plus(consult, 7 + Math.floor(rnd() * 30))
          surgeryDate = surgery
          const c = rnd()
          if (c < 0.18) {
            stage = 'canceled'
            canceledDate = plus(consult, 3)
            refundAmount = c < 0.09 ? depositAmount : Math.round(depositAmount / 2)
          } else if (surgery <= today) {
            stage = 'paid'
            paidDate = surgery
          } else stage = 'reserved'
        }
        if ((paidDate ?? '') > today || (depositDate ?? '') > today || (canceledDate ?? '') > today) {
          // 아직 오지 않은 날짜면 그 전 단계로
          stage = 'visited'
          amount = depositAmount = null
          depositDate = paidDate = canceledDate = surgeryDate = null
          refundAmount = null
        }
      }
      inquiries.push({
        id: `sample-${m}-${k}`,
        date,
        channel,
        source,
        campaign: source === '인스타' && rnd() < 0.4 ? `${Number(m.slice(5))}월 인스타 실리프팅` : '',
        nationality,
        interest,
        stage,
        ...stageFieldsFor(
          stage,
          { bookedDate: date, consultAt, visitedDate: stage === 'booked' ? null : consultDay > today ? today : consultDay, surgeryDate, amount, depositAmount, depositDate, paidDate, canceledDate, refundAmount },
          today,
        ),
        // 문의만 한 사람은 보통 이름을 모른다. 상담 예약 이후는 대부분 안다고 가정 (가상 이름)
        ...(stage === 'inquiry' || rnd() < 0.15
          ? { patientName: '', birthDate: null }
          : {
              patientName: `${pick([['김', 3], ['이', 3], ['박', 2], ['최', 1], ['정', 1], ['강', 1], ['조', 1], ['윤', 1]])}${pick([['예시', 1], ['가상', 1], ['샘플', 1]])}`,
              birthDate: `${1955 + Math.floor(rnd() * 45)}-${String(1 + Math.floor(rnd() * 12)).padStart(2, '0')}-${String(1 + Math.floor(rnd() * 28)).padStart(2, '0')}`,
            }),
        note: rnd() < 0.3 ? pick([['재문의', 1], ['50대 여', 1], ['가족 동반', 1], ['통역 필요', 1]]) : '',
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
