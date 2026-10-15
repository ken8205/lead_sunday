import { useCallback, useEffect, useState } from 'react'
import { isCloud, supabase } from '../lib/supabase'
import type { AdCost, Inquiry, NewInquiry, OptionKind, OptionLists, Stage } from '../inquiries'
import { DEFAULT_OPTIONS, OPTION_KINDS } from '../inquiries'
import { sampleData } from '../lib/sample'

export interface InquiriesApi {
  inquiries: Inquiry[]
  adCosts: AdCost[]
  options: OptionLists // 입력 화면 선택지
  ready: boolean
  error: string | null
  add: (i: NewInquiry) => void
  update: (id: string, patch: Partial<NewInquiry>) => void
  remove: (id: string) => void
  setAdCost: (month: string, source: string, amount: number) => void // 0이면 지운다
  setOptions: (kind: OptionKind, items: string[]) => void
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
  deposit_amount: number | null
  deposit_date: string | null
  paid_date: string | null
  canceled_date: string | null
  refund_amount: number | null
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
  depositAmount: r.deposit_amount ?? null,
  depositDate: r.deposit_date ?? null,
  paidDate: r.paid_date,
  canceledDate: r.canceled_date ?? null,
  refundAmount: r.refund_amount ?? null,
  note: r.note,
  staff: r.staff,
  createdAt: Date.parse(r.created_at),
})

function toRow(p: Partial<NewInquiry>) {
  const row: Record<string, unknown> = {}
  if (p.date !== undefined) row.inquiry_date = p.date
  if (p.paidDate !== undefined) row.paid_date = p.paidDate
  if (p.depositAmount !== undefined) row.deposit_amount = p.depositAmount
  if (p.depositDate !== undefined) row.deposit_date = p.depositDate
  if (p.canceledDate !== undefined) row.canceled_date = p.canceledDate
  if (p.refundAmount !== undefined) row.refund_amount = p.refundAmount
  for (const k of ['channel', 'source', 'campaign', 'nationality', 'interest', 'stage', 'amount', 'note', 'staff'] as const) {
    if (p[k] !== undefined) row[k] = p[k]
  }
  return row
}

// 서버에 저장된 목록만 덮어쓰고, 아직 저장한 적 없는 종류는 기본 목록을 쓴다.
function mergeOptions(rows: { kind: OptionKind; items: string[] }[]): OptionLists {
  const o = { ...DEFAULT_OPTIONS }
  for (const r of rows) if (OPTION_KINDS.includes(r.kind) && Array.isArray(r.items)) o[r.kind] = r.items
  return o
}

const byNewest = (a: Inquiry, b: Inquiry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt

// ───────── 서버 모드 ─────────
function useCloudInquiries(): InquiriesApi {
  const sb = supabase!
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [adCosts, setAdCosts] = useState<AdCost[]>([])
  const [options, setOptionsState] = useState<OptionLists>(DEFAULT_OPTIONS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [q, c, o] = await Promise.all([sb.from('inquiries').select('*'), sb.from('ad_costs').select('*'), sb.from('option_lists').select('kind, items')])
    if (q.error) {
      setError('상담 대장을 불러오지 못했습니다. (서버에 schema-4-inquiries.sql을 실행했는지 확인)')
      return
    }
    setError(null)
    setInquiries((q.data as InquiryRow[]).map(toInquiry).sort(byNewest))
    if (!c.error) setAdCosts(c.data as AdCost[]) // 원장·실장이 아니면 광고비는 읽을 수 없다
    if (!o.error) setOptionsState(mergeOptions(o.data as { kind: OptionKind; items: string[] }[]))
    setReady(true)
  }, [sb])

  useEffect(() => {
    load()
    const ch = sb
      .channel('inquiries-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inquiries' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'option_lists' }, load)
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
    options,
    ready,
    error,
    setOptions: (kind, items) => {
      setOptionsState((o) => ({ ...o, [kind]: items }))
      sb.from('option_lists')
        .upsert({ kind, items })
        .then(({ error: e }) => report(e, '항목 저장'))
    },
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
const LOCAL_KEY = 'inquiry-stats:v2' // 예시 데이터의 채널·경로 이름이 바뀌어 새 키로 시작한다

interface LocalData {
  inquiries: Inquiry[]
  adCosts: AdCost[]
  options: OptionLists
}

// 시험 모드: 예전 기본 목록을 그대로 쓰고 있으면 새 기본 목록으로 바꾸고, 예시 데이터의 이름도 새 이름으로 맞춘다.
const OLD_DEFAULTS: Partial<Record<OptionKind, { lists: string[][]; renamed: Record<string, string> }>> = {
  nationality: {
    lists: [
      ['한국', '일본', '중국', '대만·홍콩', '미국·캐나다', '호주·뉴질랜드', '영국·유럽', '동남아', '기타'],
      ['한국', '일본', '미국', '캐나다', '호주', '뉴질랜드', '영국', '유럽', '동남아', '대만', '홍콩', '기타'],
    ],
    renamed: { '미국·캐나다': '미국', '호주·뉴질랜드': '호주', '대만·홍콩': '대만', '영국·유럽': '영국' },
  },
  interest: {
    lists: [['실리프팅', '미니거상', '안면거상', '목거상·이중턱', '상안검(눈처짐)', '하안검·눈밑지방재배치', '필러', '스킨부스터', '보톡스', '안면윤곽', '코', '쌍꺼풀', '기타'],
      ['실리프팅', '안면거상', '처진눈성형', '눈밑지방재배치', '눈성형', '필러 및 스킨부스터', '코성형', '안면윤곽', '지방이식'],
    ],
    renamed: { '목거상·이중턱': '안면거상', '상안검(눈처짐)': '처진눈성형', '하안검·눈밑지방재배치': '눈밑지방재배치', 필러: '필러 및 스킨부스터', 스킨부스터: '필러 및 스킨부스터', 보톡스: '필러 및 스킨부스터', 코: '코성형', 쌍꺼풀: '눈성형' },
  },
}
function migrateLocal(d: LocalData): LocalData {
  let out = d
  for (const kind of ['nationality', 'interest'] as const) {
    const old = OLD_DEFAULTS[kind]!
    if (!old.lists.some((l) => l.join() === out.options[kind].join())) continue
    out = {
      ...out,
      options: { ...out.options, [kind]: DEFAULT_OPTIONS[kind] },
      inquiries: out.inquiries.map((i) => (i.id.startsWith('sample-') && old.renamed[i[kind]] ? { ...i, [kind]: old.renamed[i[kind]] } : i)),
    }
  }
  return out
}

function loadLocal(): LocalData {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '')
    if (Array.isArray(v.inquiries) && Array.isArray(v.adCosts))
      return migrateLocal({ ...v, inquiries: v.inquiries.map((i: Inquiry) => Object.assign({ depositAmount: null, depositDate: null, canceledDate: null, refundAmount: null }, i)), options: { ...DEFAULT_OPTIONS, ...v.options } })
  } catch {
    // 없거나 깨졌으면 빈 대장
  }
  return { ...sampleData(), options: DEFAULT_OPTIONS } // 처음 열면 예시로 채워 화면을 바로 볼 수 있게 한다 (시험 모드 전용, 가상 데이터)
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
    options: data.options,
    setOptions: (kind, items) => setData((d) => ({ ...d, options: { ...d.options, [kind]: items } })),
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
    replaceAll: (d) => setData((x) => ({ ...x, ...d })),
  }
}

// 빌드 시점에 한 번 정해진다 (useBoardStore와 같은 방식).
export const useInquiries: () => InquiriesApi = isCloud ? useCloudInquiries : useLocalInquiries
