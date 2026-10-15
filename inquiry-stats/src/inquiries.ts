// 상담 대장: 문의 한 건 = 한 줄. 내원경로·마케팅 효과 통계용이라 이름·연락처·생년월일은 받지 않는다.

// 단계 (지금까지 간 가장 마지막 단계 하나만 기록한다)
//   문의만     문의만 하고 아직 상담 날짜를 잡지 않음
//   상담 예약  병원 상담 날짜를 잡음 (전화·카톡 등 어떤 채널이든)
//   내원 상담  병원에 와서 상담함 (예약 없이 바로 와도 여기)
//   수술 예약  수술 날짜를 잡고 예약금을 받음 (보통 총액의 10%)
//   결제 완료  완불 (수술 당일 잔금, 또는 당일 상담·당일 시술로 전액)
//   취소       수술 예약 후 취소 (전액·일부 환불 또는 환불 없음)
export type Stage = 'inquiry' | 'booked' | 'visited' | 'reserved' | 'paid' | 'canceled'
export const STAGES: Stage[] = ['inquiry', 'booked', 'visited', 'reserved', 'paid'] // 진행 순서 (취소는 따로)
export const STAGE_LABEL: Record<Stage, string> = {
  inquiry: '문의만',
  booked: '상담 예약',
  visited: '내원 상담',
  reserved: '수술 예약',
  paid: '결제 완료',
  canceled: '취소',
}
export const DEPOSIT_RATE = 0.1 // 수술 예약금: 총액의 10%

export interface Inquiry {
  id: string
  date: string // 문의일 YYYY-MM-DD
  channel: string // 문의 창구
  source: string // 알게 된 경로
  campaign: string // 광고·이벤트 이름 (선택)
  nationality: string
  interest: string // 관심 시술
  stage: Stage // 지금까지 도달한 가장 마지막 단계
  amount: number | null // 수술·시술 총액 (만원). 수술 예약 때 정해진다
  depositAmount: number | null // 예약금 (만원). 당일 전액 결제면 비어 있음
  depositDate: string | null // 예약금 받은 날
  paidDate: string | null // 완불한 날 (잔금 또는 전액). 엑셀 매출 장부와 맞춰 볼 때 사용
  canceledDate: string | null // 수술 예약을 취소한 날
  refundAmount: number | null // 취소 때 돌려준 금액 (만원)
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
  nationality: ['한국', '일본', '미국', '캐나다', '호주', '뉴질랜드', '영국', '유럽', '중국', '대만', '홍콩', '동남아', '러시아', '스탄지역', '중동지역', '기타'],
  interest: ['실리프팅', '미니거상', '안면거상', '처진눈성형', '눈밑지방재배치', '눈성형', '필러 및 스킨부스터', '코성형', '안면윤곽', '지방이식'],
}

// 그 단계까지 갔는지. 취소는 수술 예약까지 갔다가 멈춘 것으로 본다.
export function reached(i: Inquiry, s: Stage): boolean {
  if (s === 'canceled') return i.stage === 'canceled'
  const at = i.stage === 'canceled' ? STAGES.indexOf('reserved') : STAGES.indexOf(i.stage)
  return at >= STAGES.indexOf(s)
}

// 아직 받지 않은 잔금 (수술 예약 상태일 때만)
export const balanceDue = (i: Inquiry) => (i.stage === 'reserved' && i.amount != null ? Math.max(0, i.amount - (i.depositAmount ?? 0)) : 0)

// 단계보다 앞의 돈 기록은 지운다 (단계를 되돌렸을 때)
export function paymentFieldsFor(stage: Stage, i: Pick<Inquiry, 'amount' | 'depositAmount' | 'depositDate' | 'paidDate' | 'canceledDate' | 'refundAmount'>) {
  const money = stage === 'reserved' || stage === 'paid' || stage === 'canceled'
  return {
    amount: money ? i.amount : null,
    depositAmount: money ? i.depositAmount : null,
    depositDate: money && i.depositAmount ? i.depositDate : null,
    paidDate: stage === 'paid' ? i.paidDate : null,
    canceledDate: stage === 'canceled' ? i.canceledDate : null,
    refundAmount: stage === 'canceled' ? i.refundAmount : null,
  }
}

// 이 기기의 날짜 (toISOString은 UTC라 한국 오전 9시 전에는 어제가 된다)
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
