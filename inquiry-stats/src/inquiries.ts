// 하루 기록장: 그날 일어난 일을 그날 카드 한 장으로 적는다. 예전 카드를 찾아 고치지 않는다.
//   문의  처음 연락 온 날 1장 (숫자만 센다. 누구인지는 적지 않는다)
//   상담  병원에서 상담한 날 1장 (재상담도 1장)
//   시술  수술·시술한 날 1장. 총액(만원)을 적는다 = 그날 매출 (발생주의: 예약금은 매출이 아님)
// 규칙
//   - 모든 카드에 유입 경로를 붙인다 (모르면 "모름")
//   - 예약 없이 바로 온 환자(워크인)는 그날 문의 1장도 같이 센다
//   - 한 환자가 같은 날 여러 시술을 받으면 시술 1장, 총액은 합쳐서
//   - 패키지·회차 시술은 첫 회에 총액 전부를 적고, 2회차부터는 적지 않는다

export type Kind = 'inquiry' | 'consult' | 'treatment'
export const KINDS: Kind[] = ['inquiry', 'consult', 'treatment']
export const KIND_LABEL: Record<Kind, string> = { inquiry: '문의', consult: '상담', treatment: '시술' }

export interface Entry {
  id: string
  date: string // 일어난 날 YYYY-MM-DD
  kind: Kind
  source: string // 유입 경로 (필수, 모르면 "모름")
  channel: string // 문의 채널 (문의 카드만)
  nationality: string
  interest: string // 문의·상담: 관심 시술, 시술: 한 시술
  amount: number | null // 시술 총액 (만원). 시술 카드만
  patientName: string // 상담·시술 카드에 선택으로
  note: string
  createdAt: number
}
export type NewEntry = Omit<Entry, 'id' | 'createdAt'>

export interface AdCost {
  month: string // YYYY-MM
  source: string
  amount: number // 만원
}

// 입력 화면의 선택지. 직원 누구나 "항목 관리"에서 추가·순서 변경·삭제한다.
// 목록에서 지워도 이미 기록된 카드의 값은 그대로 남는다 (통계에도 그대로 나온다).
export type OptionKind = 'channel' | 'source' | 'nationality' | 'interest'
export type OptionLists = Record<OptionKind, string[]>
export const OPTION_KINDS: OptionKind[] = ['source', 'channel', 'nationality', 'interest']
export const OPTION_LABEL: Record<OptionKind, string> = { channel: '문의 채널', source: '유입 경로', nationality: '국적', interest: '시술' }

export const UNKNOWN_SOURCE = '모름'
export const WALK_IN = '워크인'

export const DEFAULT_OPTIONS: OptionLists = {
  channel: ['인콜', '카카오채널', '강남언니', '네이버예약', '미뷰', '메이비', '해외에이전시', '홈페이지', '인스타DM', '기타'],
  source: ['강남언니', '미뷰', '메이비', '소개', '구환', '인스타', '스레드', '유튜브', '인터넷', '카페', '구글검색', '홈페이지', 'AI', WALK_IN, '기타', UNKNOWN_SOURCE],
  nationality: ['한국', '일본', '미국', '캐나다', '호주', '뉴질랜드', '영국', '유럽', '중국', '대만', '홍콩', '동남아', '러시아', '스탄지역', '중동지역', '기타'],
  interest: ['실리프팅', '미니거상', '안면거상', '처진눈성형', '눈밑지방재배치', '눈성형', '필러 및 스킨부스터', '코성형', '안면윤곽', '지방이식'],
}

// 이 기기의 날짜 (toISOString은 UTC라 한국 오전 9시 전에는 어제가 된다)
export function localDate(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
