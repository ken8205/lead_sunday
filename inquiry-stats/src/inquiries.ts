// 상담 대장: 문의 한 건 = 한 줄. 내원경로·마케팅 효과 통계용이라 이름·연락처·생년월일은 받지 않는다.

export type Stage = 'inquiry' | 'booked' | 'visited' | 'paid'
export const STAGES: Stage[] = ['inquiry', 'booked', 'visited', 'paid']
export const STAGE_LABEL: Record<Stage, string> = {
  inquiry: '문의만',
  booked: '상담 예약',
  visited: '내원 상담',
  paid: '결제',
}

export interface Inquiry {
  id: string
  date: string // 문의일 YYYY-MM-DD
  channel: string // 문의 창구
  source: string // 알게 된 경로
  campaign: string // 광고·이벤트 이름 (선택)
  nationality: string
  interest: string // 관심 시술
  stage: Stage // 지금까지 도달한 가장 마지막 단계
  amount: number | null // 결제 금액 (만원)
  paidDate: string | null // 결제일 YYYY-MM-DD (엑셀 매출 장부와 맞춰 볼 때 사용)
  note: string // 이니셜·짧은 메모
  staff: string
  createdAt: number
}
export type NewInquiry = Omit<Inquiry, 'id' | 'createdAt'>

export interface AdCost {
  month: string // YYYY-MM
  source: string
  amount: number // 만원
}

// 입력 화면의 선택지. 원장·실장이 "항목 관리"에서 추가·순서 변경·삭제한다.
// 목록에서 지워도 이미 기록된 문의의 값은 그대로 남는다 (통계에도 그대로 나온다).
export type OptionKind = 'channel' | 'source' | 'nationality' | 'interest'
export type OptionLists = Record<OptionKind, string[]>
export const OPTION_KINDS: OptionKind[] = ['channel', 'source', 'nationality', 'interest']
export const OPTION_LABEL: Record<OptionKind, string> = { channel: '문의 채널', source: '유입 경로', nationality: '국적', interest: '관심 시술' }

export const DEFAULT_OPTIONS: OptionLists = {
  channel: ['인콜', '카카오채널', '강남언니', '네이버예약', '미뷰', '메이비', '해외에이전시', '홈페이지', '인스타DM', '기타'],
  source: ['강남언니', '미뷰', '메이비', '소개', '구환', '인스타', '스레드', '유튜브', '인터넷', '카페', '구글검색', '홈페이지', 'AI', '기타'],
  nationality: ['한국', '일본', '중국', '대만·홍콩', '미국·캐나다', '호주·뉴질랜드', '영국·유럽', '동남아', '기타'],
  interest: ['실리프팅', '미니거상', '안면거상', '목거상·이중턱', '상안검(눈처짐)', '하안검·눈밑지방재배치', '필러', '스킨부스터', '보톡스', '안면윤곽', '코', '쌍꺼풀', '기타'],
}

export function reached(i: Inquiry, s: Stage): boolean {
  return STAGES.indexOf(i.stage) >= STAGES.indexOf(s)
}

// 이 기기의 날짜 (toISOString은 UTC라 한국 오전 9시 전에는 어제가 된다)
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
