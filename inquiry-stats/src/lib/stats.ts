import type { AdCost, Entry, Rates } from '../inquiries'

export type GroupKey = 'source' | 'channel' | 'nationality' | 'interest'
export const GROUP_LABEL: Record<GroupKey, string> = {
  channel: '문의 채널',
  source: '유입 경로',
  nationality: '국적',
  interest: '시술',
}
export const EMPTY_GROUP = '(비어 있음)'

export type Gran = 'day' | 'week' | 'month' | 'year'
export const GRAN_LABEL: Record<Gran, string> = { day: '일간', week: '주간', month: '월간', year: '연간' }
// 추이 그래프에 보여 줄 구간 수 (오늘이 들어간 구간까지)
export const GRAN_SPAN: Record<Gran, number> = { day: 30, week: 12, month: 12, year: 5 }
export const GRAN_SPAN_LABEL: Record<Gran, string> = { day: '최근 30일', week: '최근 12주', month: '최근 12개월', year: '최근 5년' }

export interface StatRow {
  key: string
  label: string
  inquiry: number // 문의 카드 수
  consult: number // 상담 카드 수
  treatment: number // 시술 카드 수
  revenue: number // 시술 총액 합 (만원)
  commission: number // 수수료 (시술 총액 × 그 경로 수수료율, 만원)
  adCost: number | null // 광고비 (만원). 알 수 없으면 null (경로가 아닌 항목, 주 단위)
  partial?: boolean // 기간 경계에 걸려 일부만 포함된 구간
}

// 기간은 달 단위 (광고비가 월 단위라서). from, to는 YYYY-MM, 둘 다 포함.
// 기간은 달(YYYY-MM) 또는 날(YYYY-MM-DD). 달이면 그 달 전체.
export const periodStart = (from: string) => (from.length === 7 ? `${from}-01` : from)
export const periodEnd = (to: string) => (to.length === 7 ? lastDayOfMonth(to) : to)
export const inPeriod = (date: string, from: string, to: string) => date >= periodStart(from) && date <= periodEnd(to)

// 광고비는 달 단위로만 입력하므로, 기간에 통째로 들어간 달의 광고비만 센다. [첫 달, 끝 달] (없으면 첫 달 > 끝 달)
export function costMonths(from: string, to: string): [string, string] {
  const a = periodStart(from)
  const b = periodEnd(to)
  const first = a.endsWith('-01') ? a.slice(0, 7) : nextMonth(a.slice(0, 7))
  const last = b === lastDayOfMonth(b.slice(0, 7)) ? b.slice(0, 7) : addMonths(b.slice(0, 7), -1)
  return [first, last]
}

function summarize(key: string, label: string, list: Entry[], adCost: number | null, rates: Rates): StatRow {
  let inquiry = 0
  let consult = 0
  let treatment = 0
  let revenue = 0
  let commission = 0
  for (const e of list) {
    if (e.kind === 'inquiry') inquiry++
    else if (e.kind === 'consult') consult++
    else {
      treatment++
      revenue += e.amount ?? 0
      commission += ((e.amount ?? 0) * (rates[e.source] ?? 0)) / 100
    }
  }
  return { key, label, inquiry, consult, treatment, revenue, commission: Math.round(commission), adCost }
}

const sumCost = (costs: AdCost[], pred: (c: AdCost) => boolean) => costs.filter(pred).reduce((s, c) => s + c.amount, 0)

// 광고비는 유입 경로별로만 입력하므로, 경로로 좁힌 경우에만 그 경로 광고비를 쓴다.
export interface Scope {
  by: GroupKey
  value: string
}
const costFilter = (scope?: Scope) => (c: AdCost) => !scope || (scope.by === 'source' && c.source === scope.value)
const hasCost = (scope?: Scope) => !scope || scope.by === 'source'

export function totalRow(list: Entry[], costs: AdCost[], rates: Rates, from: string, to: string, scope?: Scope): StatRow {
  const f = costFilter(scope)
  return summarize('total', '합계', list, hasCost(scope) ? sumCost(costs, (c) => f(c) && c.month >= from && c.month <= to) : null, rates)
}

export const groupValue = (e: Entry, by: GroupKey) => e[by] || EMPTY_GROUP

export function groupStats(list: Entry[], by: GroupKey, costs: AdCost[], rates: Rates, from: string, to: string): StatRow[] {
  const groups = new Map<string, Entry[]>()
  for (const e of list) {
    if (by === 'channel' && e.kind !== 'inquiry') continue // 문의 채널은 문의 카드에만 있다
    const k = groupValue(e, by)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(e)
  }
  const costBySource = new Map<string, number>()
  if (by === 'source') {
    for (const c of costs) if (c.month >= from && c.month <= to) costBySource.set(c.source, (costBySource.get(c.source) ?? 0) + c.amount)
    for (const s of costBySource.keys()) if (!groups.has(s)) groups.set(s, []) // 광고비만 쓰고 기록이 0건인 경로도 보여 준다
  }
  return [...groups.entries()]
    .map(([k, l]) => summarize(k, k, l, by === 'source' ? (costBySource.get(k) ?? 0) : null, rates))
    .sort((a, b) => b.revenue - a.revenue || b.inquiry - a.inquiry)
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
  return gran === 'day' ? date : gran === 'week' ? weekStart(date) : gran === 'month' ? date.slice(0, 7) : date.slice(0, 4)
}

export function bucketLabel(key: string, gran: Gran): string {
  if (gran === 'day' || gran === 'week') return `${Number(key.slice(5, 7))}/${Number(key.slice(8, 10))}${gran === 'week' ? '주' : ''}`
  if (gran === 'month') return `${key.slice(2, 4)}.${key.slice(5, 7)}`
  return `${key}`
}

// 추이: 오늘이 들어간 구간을 끝으로, 정해진 개수만큼 거꾸로 (빈 구간도 빠짐없이). 마지막 구간은 아직 진행 중.
export function trendWindow(list: Entry[], rates: Rates, gran: Gran, today: string): StatRow[] {
  const keys: string[] = []
  const n = GRAN_SPAN[gran]
  if (gran === 'day') for (let k = n - 1; k >= 0; k--) keys.push(fromDay(toDay(today) - k * DAY))
  else if (gran === 'week') for (let k = n - 1; k >= 0; k--) keys.push(fromDay(toDay(weekStart(today)) - k * 7 * DAY))
  else if (gran === 'month') for (let k = n - 1; k >= 0; k--) keys.push(addMonths(today.slice(0, 7), -k))
  else for (let k = n - 1; k >= 0; k--) keys.push(String(Number(today.slice(0, 4)) - k))
  const first = keys[0]
  const byBucket = new Map<string, Entry[]>()
  for (const e of list) {
    const k = bucketOf(e.date, gran)
    if (k < first) continue
    if (!byBucket.has(k)) byBucket.set(k, [])
    byBucket.get(k)!.push(e)
  }
  return keys.map((key, i) => ({ ...summarize(key, bucketLabel(key, gran), byBucket.get(key) ?? [], null, rates), partial: i === keys.length - 1 }))
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
// 마케팅비 = 광고비 + 수수료 (광고비를 알 수 없으면 수수료만)
export const marketing = (r: StatRow) => (r.adCost ?? 0) + r.commission

export const won = (manwon: number) => `${manwon.toLocaleString('ko-KR')}만원`
