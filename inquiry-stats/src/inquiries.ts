// 상담 대장: 문의 한 건 = 한 줄. 이름·생년월일은 알 때만 적는다(문의만 한 사람은 보통 모름). 연락처는 받지 않는다.

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
  patientName: string // 실명 (모르면 빈 값)
  birthDate: string | null // 생년월일 YYYY-MM-DD (모르면 비움)
  channel: string // 문의 창구
  source: string // 알게 된 경로
  campaign: string // 광고·이벤트 이름 (선택)
  nationality: string
  interest: string // 관심 시술
  stage: Stage // 지금까지 도달한 가장 마지막 단계
  bookedDate: string | null // 상담 예약한 날
  consultAt: string | null // 상담 예정 일시 'YYYY-MM-DDTHH:MM' (시간은 비어 있을 수 있음: 'YYYY-MM-DD')
  visitedDate: string | null // 내원 상담한 날
  surgeryDate: string | null // 수술 예정일 (수술 예약 때)
  amount: number | null // 수술·시술 총액 (만원). 수술 예약 때 정해진다
  depositAmount: number | null // 예약금 (만원). 당일 전액 결제면 비어 있음
  depositDate: string | null // 예약금 받은 날
  paidDate: string | null // 완불한 날 (잔금 또는 전액). 엑셀 매출 장부와 맞춰 볼 때 사용
  canceledDate: string | null // 수술 예약을 취소한 날
  refundAmount: number | null // 취소 때 돌려준 금액 (만원)
  note: string // 짧은 메모 (예: 50대 여, 재문의). 연락처는 적지 않는다
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

type StageFields = Pick<
  Inquiry,
  'bookedDate' | 'consultAt' | 'visitedDate' | 'surgeryDate' | 'amount' | 'depositAmount' | 'depositDate' | 'paidDate' | 'canceledDate' | 'refundAmount'
>

// 단계에 맞게 날짜·돈 기록을 정리한다.
//  - 지금 단계보다 뒤의 기록은 지운다 (단계를 되돌렸을 때)
//  - 거친 단계인데 날짜가 비어 있으면 (예: 예약 없이 바로 내원) 다음 단계의 날짜로 채운다. 그것도 없으면 오늘.
export function stageFieldsFor(stage: Stage, i: StageFields, today: string): StageFields {
  const money = stage === 'reserved' || stage === 'paid' || stage === 'canceled'
  const r = (s: Stage) => reached({ stage } as Inquiry, s)
  const out: StageFields = {
    bookedDate: r('booked') ? i.bookedDate : null,
    consultAt: r('booked') ? i.consultAt : null,
    visitedDate: r('visited') ? i.visitedDate : null,
    surgeryDate: r('reserved') ? i.surgeryDate : null,
    amount: money ? i.amount : null,
    depositAmount: money ? i.depositAmount : null,
    depositDate: money && i.depositAmount ? i.depositDate : null,
    paidDate: stage === 'paid' ? i.paidDate : null,
    canceledDate: stage === 'canceled' ? i.canceledDate : null,
    refundAmount: stage === 'canceled' ? i.refundAmount : null,
  }
  // 늦은 단계부터 거꾸로 채운다
  if (stage === 'paid') out.paidDate ??= today
  if (stage === 'canceled') out.canceledDate ??= today
  if (out.depositAmount) out.depositDate ??= out.paidDate ?? out.canceledDate ?? today
  const after = out.depositDate ?? out.paidDate ?? out.canceledDate
  if (r('visited')) out.visitedDate ??= after ?? today
  if (r('booked')) out.bookedDate ??= out.visitedDate ?? after ?? today
  return out
}

// 생년월일 입력을 YYYY-MM-DD로 맞춘다. 750314 / 19750314 / 1975.03.14 / 1975-3-14 모두 받는다. 알아볼 수 없으면 null.
export function normalizeBirth(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null
  let y: number, m: number, d: number
  const parts = t.split(/[.\-/\s]+/).filter(Boolean)
  if (parts.length === 3) [y, m, d] = parts.map(Number)
  else {
    const digits = t.replace(/\D/g, '')
    if (digits.length === 8) [y, m, d] = [Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6))]
    else if (digits.length === 6) [y, m, d] = [Number(digits.slice(0, 2)), Number(digits.slice(2, 4)), Number(digits.slice(4))]
    else return null
  }
  if (y < 100) y += y > Number(String(new Date().getFullYear()).slice(2)) ? 1900 : 2000 // 두 자리 연도: 올해보다 크면 1900년대
  const p = (n: number) => String(n).padStart(2, '0')
  const s = `${y}-${p(m)}-${p(d)}`
  const dt = new Date(`${s}T00:00:00`)
  return dt.getFullYear() === y && dt.getMonth() + 1 === m && dt.getDate() === d && y >= 1900 ? s : null
}

// 검색용: 이름·생년월일(여러 형태)·메모·경로 등을 한 줄로
export function searchText(i: Inquiry): string {
  const b = i.birthDate ?? ''
  const birthForms = b ? [b, b.replace(/-/g, ''), b.slice(2).replace(/-/g, ''), b.replace(/-/g, '.')] : []
  return [i.patientName, ...birthForms, i.note, i.source, i.channel, i.interest, i.nationality, i.staff, i.campaign].join(' ').toLowerCase()
}

// 상담 예정 일시를 보기 좋게: '10/15 14:00' 또는 '10/15'
export function shortAt(at: string | null): string {
  if (!at) return ''
  const md = `${Number(at.slice(5, 7))}/${Number(at.slice(8, 10))}`
  return at.length > 10 ? `${md} ${at.slice(11, 16)}` : md
}

// 이 기기의 날짜 (toISOString은 UTC라 한국 오전 9시 전에는 어제가 된다)
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
