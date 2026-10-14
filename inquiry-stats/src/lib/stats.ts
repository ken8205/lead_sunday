import type { AdCost, Inquiry } from '../inquiries'
import { reached } from '../inquiries'

export type GroupKey = 'source' | 'channel' | 'nationality' | 'interest' | 'campaign'

export interface StatRow {
  key: string
  total: number // 문의
  booked: number // 상담 예약 이상
  visited: number // 내원 상담 이상
  paid: number // 결제
  revenue: number // 결제 금액 합 (만원)
  adCost: number | null // 광고비 (만원). 경로별로 볼 때만
}

// 기간은 달 단위 (광고비가 월 단위라서). from, to는 YYYY-MM, 둘 다 포함.
export const inPeriod = (date: string, from: string, to: string) => {
  const m = date.slice(0, 7)
  return m >= from && m <= to
}

function summarize(key: string, list: Inquiry[], adCost: number | null): StatRow {
  return {
    key,
    total: list.length,
    booked: list.filter((i) => reached(i, 'booked')).length,
    visited: list.filter((i) => reached(i, 'visited')).length,
    paid: list.filter((i) => reached(i, 'paid')).length,
    revenue: list.reduce((s, i) => s + (i.stage === 'paid' ? (i.amount ?? 0) : 0), 0),
    adCost,
  }
}

export function totalRow(list: Inquiry[], costs: AdCost[], from: string, to: string): StatRow {
  const cost = costs.filter((c) => c.month >= from && c.month <= to).reduce((s, c) => s + c.amount, 0)
  return summarize('합계', list, cost)
}

export function groupStats(list: Inquiry[], by: GroupKey, costs: AdCost[], from: string, to: string): StatRow[] {
  const groups = new Map<string, Inquiry[]>()
  for (const i of list) {
    const k = i[by] || '(비어 있음)'
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k)!.push(i)
  }
  const costBySource = new Map<string, number>()
  if (by === 'source') {
    for (const c of costs) if (c.month >= from && c.month <= to) costBySource.set(c.source, (costBySource.get(c.source) ?? 0) + c.amount)
    for (const s of costBySource.keys()) if (!groups.has(s)) groups.set(s, []) // 광고비만 쓰고 문의가 0건인 경로도 보여 준다
  }
  return [...groups.entries()]
    .map(([k, l]) => summarize(k, l, by === 'source' ? (costBySource.get(k) ?? 0) : null))
    .sort((a, b) => b.total - a.total || b.revenue - a.revenue)
}

export function monthStats(list: Inquiry[], costs: AdCost[], from: string, to: string): StatRow[] {
  const rows: StatRow[] = []
  for (let m = from; m <= to; m = nextMonth(m)) {
    const cost = costs.filter((c) => c.month === m).reduce((s, c) => s + c.amount, 0)
    rows.push(summarize(m, list.filter((i) => i.date.startsWith(m)), cost))
  }
  return rows
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

export const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : '–')
export const won = (manwon: number) => `${manwon.toLocaleString('ko-KR')}만원`
