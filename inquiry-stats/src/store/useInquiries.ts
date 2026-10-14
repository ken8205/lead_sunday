import { useCallback, useEffect, useState } from 'react'
import { isCloud, supabase } from '../lib/supabase'
import type { AdCost, Inquiry, NewInquiry, Stage } from '../inquiries'
import { sampleData } from '../lib/sample'

export interface InquiriesApi {
  inquiries: Inquiry[]
  adCosts: AdCost[]
  ready: boolean
  error: string | null
  add: (i: NewInquiry) => void
  update: (id: string, patch: Partial<NewInquiry>) => void
  remove: (id: string) => void
  setAdCost: (month: string, source: string, amount: number) => void // 0이면 지운다
  replaceAll?: (d: { inquiries: Inquiry[]; adCosts: AdCost[] }) => void // 이 브라우저 전용 모드에서만 (예시 채우기·비우기)
}

interface InquiryRow {
  id: string
  inquiry_date: string
  channel: string
  source: string
  campaign: string
  nationality: string
  interest: string
  stage: Stage
  amount: number | null
  paid_date: string | null
  note: string
  staff: string
  created_at: string
}

const toInquiry = (r: InquiryRow): Inquiry => ({
  id: r.id,
  date: r.inquiry_date,
  channel: r.channel,
  source: r.source,
  campaign: r.campaign,
  nationality: r.nationality,
  interest: r.interest,
  stage: r.stage,
  amount: r.amount,
  paidDate: r.paid_date,
  note: r.note,
  staff: r.staff,
  createdAt: Date.parse(r.created_at),
})

function toRow(p: Partial<NewInquiry>) {
  const row: Record<string, unknown> = {}
  if (p.date !== undefined) row.inquiry_date = p.date
  if (p.paidDate !== undefined) row.paid_date = p.paidDate
  for (const k of ['channel', 'source', 'campaign', 'nationality', 'interest', 'stage', 'amount', 'note', 'staff'] as const) {
    if (p[k] !== undefined) row[k] = p[k]
  }
  return row
}

const byNewest = (a: Inquiry, b: Inquiry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt

// ───────── 서버 모드 ─────────
function useCloudInquiries(): InquiriesApi {
  const sb = supabase!
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [adCosts, setAdCosts] = useState<AdCost[]>([])
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [q, c] = await Promise.all([sb.from('inquiries').select('*'), sb.from('ad_costs').select('*')])
    if (q.error) {
      setError('상담 대장을 불러오지 못했습니다. (서버에 schema-4-inquiries.sql을 실행했는지 확인)')
      return
    }
    setError(null)
    setInquiries((q.data as InquiryRow[]).map(toInquiry).sort(byNewest))
    if (!c.error) setAdCosts(c.data as AdCost[]) // 원장·실장이 아니면 광고비는 읽을 수 없다
    setReady(true)
  }, [sb])

  useEffect(() => {
    load()
    const ch = sb
      .channel('inquiries-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, load)
      .subscribe()
    const t = setInterval(load, 60000)
    return () => {
      sb.removeChannel(ch)
      clearInterval(t)
    }
  }, [sb, load])

  const report = (e: { message: string } | null, what: string) => {
    if (e) setError(`${what}하지 못했습니다: ${e.message}`)
    load()
  }

  return {
    inquiries,
    adCosts,
    ready,
    error,
    add: (i) => {
      sb.from('inquiries').insert(toRow(i)).then(({ error: e }) => report(e, '저장'))
    },
    update: (id, patch) => {
      setInquiries((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      sb.from('inquiries')
        .update({ ...toRow(patch), updated_at: new Date().toISOString() })
        .eq('id', id)
        .then(({ error: e }) => report(e, '수정'))
    },
    remove: (id) => {
      sb.from('inquiries')
        .delete()
        .eq('id', id)
        .select('id')
        .then(({ data, error: e }) => {
          if (!e && data?.length === 0) setError('삭제는 원장·실장만 할 수 있습니다.')
          report(e, '삭제')
        })
    },
    setAdCost: (month, source, amount) => {
      setAdCosts((list) => [...list.filter((x) => !(x.month === month && x.source === source)), ...(amount > 0 ? [{ month, source, amount }] : [])])
      const q = amount > 0 ? sb.from('ad_costs').upsert({ month, source, amount }) : sb.from('ad_costs').delete().eq('month', month).eq('source', source)
      q.then(({ error: e }) => report(e, '광고비 저장'))
    },
  }
}

// ───────── 이 브라우저 전용 모드 ─────────
const LOCAL_KEY = 'patient-board:inquiries'

function loadLocal(): { inquiries: Inquiry[]; adCosts: AdCost[] } {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '')
    if (Array.isArray(v.inquiries) && Array.isArray(v.adCosts)) return v
  } catch {
    // 없거나 깨졌으면 빈 대장
  }
  return sampleData() // 처음 열면 예시로 채워 화면을 바로 볼 수 있게 한다 (시험 모드 전용, 가상 데이터)
}

function useLocalInquiries(): InquiriesApi {
  const [data, setData] = useState(loadLocal)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    } catch {
      // 저장 실패는 무시
    }
  }, [data])

  return {
    inquiries: data.inquiries,
    adCosts: data.adCosts,
    ready: true,
    error: null,
    add: (i) => setData((d) => ({ ...d, inquiries: [{ ...i, id: crypto.randomUUID(), createdAt: Date.now() }, ...d.inquiries].sort(byNewest) })),
    update: (id, patch) => setData((d) => ({ ...d, inquiries: d.inquiries.map((x) => (x.id === id ? { ...x, ...patch } : x)).sort(byNewest) })),
    remove: (id) => setData((d) => ({ ...d, inquiries: d.inquiries.filter((x) => x.id !== id) })),
    setAdCost: (month, source, amount) =>
      setData((d) => ({
        ...d,
        adCosts: [...d.adCosts.filter((x) => !(x.month === month && x.source === source)), ...(amount > 0 ? [{ month, source, amount }] : [])],
      })),
    replaceAll: (d) => setData(d),
  }
}

// 빌드 시점에 한 번 정해진다 (useBoardStore와 같은 방식).
export const useInquiries: () => InquiriesApi = isCloud ? useCloudInquiries : useLocalInquiries
