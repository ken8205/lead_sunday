import type { AdCost, Inquiry } from '../inquiries'
import { reached } from '../inquiries'

export type GroupKey = 'source' | 'channel' | 'nationality' | 'interest' | 'campaign'
export const GROUP_LABEL: Record<GroupKey, string> = {
  source: '유입 경로',
  channel: '문의 채널',
  nationality: '국적',
  interest: '관심 시술',
  campaign: '광고·이벤트',
}
export const EMPTY_GROUP = '(비어 있음)'

export type Gran = 'week' | 'month' | 'year'
export const GRAN_LABEL: Record<Gran, string> = { week: '주별', month: '월별', year: '연도별' }

export interface StatRow {
  key: string
  label: string
  total: number // 문의
  booked: number // 상담 예약 이상
  visited: number // 내원 상담 이상
  reserved: number // 수술 예약 이상 (취소 포함)
  paid: number // 결제 완료
  canceled: number // 수술 예약 후 취소
  revenue: number // 결제 완료 총액 합 (만원)
  adCost: number | null // 광고비 (만원). 알 수 없으면 null (경로가 아닌 항목, 주 단위)
  partial?: boolean // 기간 경계에 걸려 일부만 포함된 주
}

// 기간은 달 단위 (광고비가 월 단위라서). from, to는 YYYY-MM, 둘 다 포함.
export const inPeriod = (date: string, from: string, to: string) => {
  const m = date.slice(0, 7)
  return m >= from && m <= to
}

function summarize(key: string, label: string, list: Inquiry[], adCost: number | null): StatRow {
  return {
    key,
    label,
    total: list.length,
    booked: list.filter((i) => reached(i, 'booked')).length,
    visited: list.filter((i) => reached(i, 'visited')).length,
    reserved: list.filter((i) => reached(i, 'reserved')).length,
    paid: list.filter((i) => reached(i, 'paid')).length,
    canceled: list.filter((i) => i.stage === 'canceled').length,
    revenue: list.reduce((s, i) => s + (i.stage === 'paid' ? (i.amount ?? 0) : 0), 0),
    adCost,
  }
}

// 받은 날 기준으로 실제 들어온 돈 (만원). 예약금은 예약금 받은 날, 잔금·전액은 완불한 날, 환불은 취소한 날(빼기).
// 문의일과 상관없이 날짜만 본다 (엑셀 매출 장부와 같은 기준).
export interface Cash {
  deposits: number
  balances: number
  refunds: number
  net: number
}
export function cashIn(list: Inquiry[], fromDay: string, toDay: string): Cash {
  const inRange = (d: string | null) => !!d && d >= fromDay && d <= toDay
  let deposits = 0
  let balances = 0
  let refunds = 0
  for (const i of list) {
    if (i.depositAmount && inRange(i.depositDate)) deposits += i.depositAmount
    if (i.stage === 'paid' && inRange(i.paidDate)) balances += Math.max(0, (i.amount ?? 0) - (i.depositAmount ?? 0))
    if (i.stage === 'canceled' && i.refundAmount && inRange(i.canceledDate)) refunds += i.refundAmount
  }
  return { deposits, balances, refunds, net: deposits + balances - refunds }
}

// 그 기간에 실제로 일어난 일 (단계별 날짜 기준, 문의일과 상관없이)
export interface Activity {
  inquiry: number
  booked: number
  visited: number
  reserved: number
  paid: number
  canceled: number
}
export function activityIn(list: Inquiry[], fromDay: string, toDay: string): Activity {
  const inRange = (d: string | null) => !!d && d >= fromDay && d <= toDay
  const n = (f: (i: Inquiry) => boolean) => list.filter(f).length
  return {
    inquiry: n((i) => inRange(i.date)),
    booked: n((i) => inRange(i.bookedDate)),
    visited: n((i) => inRange(i.visitedDate)),
    reserved: n((i) => !!i.depositAmount && inRange(i.depositDate)),
    paid: n((i) => i.stage === 'paid' && inRange(i.paidDate)),
    canceled: n((i) => i.stage === 'canceled' && inRange(i.canceledDate)),
  }
}

const sumCost = (costs: AdCost[], pred: (c: AdCost) => boolean) => costs.filter(pred).reduce((s, c) => s + c.amount, 0)

// 광고비는 "알게 된 경로"별로만 입력하므로, 경로로 좁힌 경우에만 그 경로 광고비를 쓴다.
export interface Scope {
  by: GroupKey
  value: string
}
const costFilter = (scope?: Scope) => (c: AdCost) => !scope || (scope.by === 'source' && c.source === scope.value)
const hasCost = (scope?: Scope) => !scope || scope.by === 'source'

export function totalRow(list: Inquiry[], costs: AdCost[], from: string, to: string, scope?: Scope): StatRow {
  const f = costFilter(scope)
  return summarize('total', '합계', list, hasCost(scope) ? sumCost(costs, (c) => f(c) && c.month >= from && c.month <= to) : null)
}

export const groupValue = (i: Inquiry, by: GroupKey) => i[by] || EMPTY_GROUP

export function groupStats(list: Inquiry[], by: GroupKey, costs: AdCost[], from: string, to: string): StatRow[] {
  const groups = new Map<string, Inquiry[]>()
  for (const i of list) {
    const k = groupValue(i, by)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(i)
  }
  const costBySource = new Map<string, number>()
  if (by === 'source') {
    for (const c of costs) if (c.month >= from && c.month <= to) costBySource.set(c.source, (costBySource.get(c.source) ?? 0) + c.amount)
    for (const s of costBySource.keys()) if (!groups.has(s)) groups.set(s, []) // 광고비만 쓰고 문의가 0건인 경로도 보여 준다
  }
  return [...groups.entries()]
    .map(([k, l]) => summarize(k, k, l, by === 'source' ? (costBySource.get(k) ?? 0) : null))
    .sort((a, b) => b.total - a.total || b.revenue - a.revenue)
}

// ───────── 날짜 ─────────
// 날짜 문자열(YYYY-MM-DD)만 다루고, 시간대 문제를 피하려고 UTC 자정으로 계산한다.
const toDay = (s: string) => Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10)))
const fromDay = (t: number) => new Date(t).toISOString().slice(0, 10)
const DAY = 86400000

// 그 날짜가 속한 주의 월요일 (ISO 8601: 주는 월요일에 시작)
export function weekStart(date: string): string {
  const t = toDay(date)
  const dow = (new Date(t).getUTCDay() + 6) % 7 // 월=0 … 일=6
  return fromDay(t - dow * DAY)
}

export function lastDayOfMonth(m: string): string {
  return fromDay(toDay(`${nextMonth(m)}-01`) - DAY)
}

export function bucketOf(date: string, gran: Gran): string {
  return gran === 'week' ? weekStart(date) : gran === 'month' ? date.slice(0, 7) : date.slice(0, 4)
}

export function bucketLabel(key: string, gran: Gran): string {
  if (gran === 'week') return `${key.slice(2, 4)}.${key.slice(5, 7)}.${key.slice(8, 10)} 주`
  if (gran === 'month') return `${key.slice(0, 4)}.${key.slice(5, 7)}`
  return `${key}년`
}

// 기간 안의 모든 구간을 (문의가 없는 구간도) 빠짐없이 만든다.
function buckets(from: string, to: string, gran: Gran): { key: string; partial: boolean }[] {
  const out: { key: string; partial: boolean }[] = []
  if (gran === 'month') for (let m = from; m <= to; m = nextMonth(m)) out.push({ key: m, partial: false })
  else if (gran === 'year') {
    const fy = Number(from.slice(0, 4))
    const ty = Number(to.slice(0, 4))
    for (let y = fy; y <= ty; y++) out.push({ key: String(y), partial: (y === fy && from.slice(5) !== '01') || (y === ty && to.slice(5) !== '12') })
  }
  else {
    const first = toDay(`${from}-01`)
    const last = toDay(lastDayOfMonth(to))
    for (let t = toDay(weekStart(`${from}-01`)); t <= last; t += 7 * DAY) out.push({ key: fromDay(t), partial: t < first || t + 6 * DAY > last })
  }
  return out
}

export function trendStats(list: Inquiry[], costs: AdCost[], from: string, to: string, gran: Gran, scope?: Scope): StatRow[] {
  const byBucket = new Map<string, Inquiry[]>()
  for (const i of list) {
    const k = bucketOf(i.date, gran)
    if (!byBucket.has(k)) byBucket.set(k, [])
    byBucket.get(k)!.push(i)
  }
  const f = costFilter(scope)
  return buckets(from, to, gran).map(({ key, partial }) => {
    // 주 단위는 월 광고비를 나눌 수 없어 비워 둔다.
    const cost = gran === 'week' || !hasCost(scope) ? null : sumCost(costs, (c) => f(c) && c.month >= from && c.month <= to && c.month.startsWith(key))
    return { ...summarize(key, bucketLabel(key, gran), byBucket.get(key) ?? [], cost), partial }
  })
}

export function nextMonth(m: string): string {
  const [y, mo] = m.split('-').map(Number)
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, '0')}`
}

export function addMonths(m: string, n: number): string {
  const [y, mo] = m.split('-').map(Number)
  const t = y * 12 + (mo - 1) + n
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
}

// 건수가 이보다 적으면 비율을 흐리게 보여 준다 (우연에 크게 흔들림).
export const SMALL_N = 10
export const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–')
export const won = (manwon: number) => `${manwon.toLocaleString('ko-KR')}만원`
