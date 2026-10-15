import { useCallback, useEffect, useState } from 'react'
import { isCloud, supabase } from '../lib/supabase'
import type { AdCost, Entry, Kind, NewEntry, OptionKind, OptionLists } from '../inquiries'
import { DEFAULT_OPTIONS, OPTION_KINDS } from '../inquiries'
import { sampleData } from '../lib/sample'

export interface EntriesApi {
  entries: Entry[]
  adCosts: AdCost[]
  options: OptionLists // 입력 화면 선택지
  ready: boolean
  error: string | null
  add: (e: NewEntry[]) => void // 여러 장을 한 번에 (예: 워크인 상담 = 상담 + 문의)
  update: (id: string, patch: Partial<NewEntry>) => void
  remove: (id: string) => void
  setAdCost: (month: string, source: string, amount: number) => void // 0이면 지운다
  setOptions: (kind: OptionKind, items: string[]) => void
  replaceAll?: (d: { entries: Entry[]; adCosts: AdCost[] }) => void // 이 브라우저 전용 모드에서만 (예시 채우기·비우기)
}

interface EntryRow {
  id: string
  entry_date: string
  kind: Kind
  source: string
  channel: string
  nationality: string
  interest: string
  amount: number | null
  patient_name: string
  note: string
  created_at: string
}

const toEntry = (r: EntryRow): Entry => ({
  id: r.id,
  date: r.entry_date,
  kind: r.kind,
  source: r.source,
  channel: r.channel,
  nationality: r.nationality,
  interest: r.interest,
  amount: r.amount,
  patientName: r.patient_name,
  note: r.note,
  createdAt: Date.parse(r.created_at),
})

function toRow(p: Partial<NewEntry>) {
  const row: Record<string, unknown> = {}
  if (p.date !== undefined) row.entry_date = p.date
  if (p.patientName !== undefined) row.patient_name = p.patientName
  for (const k of ['kind', 'source', 'channel', 'nationality', 'interest', 'amount', 'note'] as const) {
    if (p[k] !== undefined) row[k] = p[k]
  }
  return row
}

const byNewest = (a: Entry, b: Entry) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt

// 서버에 저장된 목록만 덮어쓰고, 아직 저장한 적 없는 종류는 기본 목록을 쓴다.
function mergeOptions(rows: { kind: OptionKind; items: string[] }[]): OptionLists {
  const o = { ...DEFAULT_OPTIONS }
  for (const r of rows) if (OPTION_KINDS.includes(r.kind) && Array.isArray(r.items)) o[r.kind] = r.items
  return o
}

// ───────── 서버 모드 ─────────
function useCloudEntries(): EntriesApi {
  const sb = supabase!
  const [entries, setEntries] = useState<Entry[]>([])
  const [adCosts, setAdCosts] = useState<AdCost[]>([])
  const [options, setOptionsState] = useState<OptionLists>(DEFAULT_OPTIONS)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [q, c, o] = await Promise.all([sb.from('entries').select('*'), sb.from('ad_costs').select('*'), sb.from('option_lists').select('kind, items')])
    if (q.error) {
      setError('기록을 불러오지 못했습니다. (서버에 schema.sql을 실행했는지 확인)')
      return
    }
    setError(null)
    setEntries((q.data as EntryRow[]).map(toEntry).sort(byNewest))
    if (!c.error) setAdCosts(c.data as AdCost[]) // 원장·실장이 아니면 광고비는 읽을 수 없다
    if (!o.error) setOptionsState(mergeOptions(o.data as { kind: OptionKind; items: string[] }[]))
    setReady(true)
  }, [sb])

  useEffect(() => {
    load()
    const ch = sb
      .channel('entries-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entries' }, load)
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
    entries,
    adCosts,
    options,
    ready,
    error,
    add: (list) => {
      sb.from('entries').insert(list.map(toRow)).then(({ error: e }) => report(e, '저장'))
    },
    update: (id, patch) => {
      setEntries((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
      sb.from('entries').update(toRow(patch)).eq('id', id).then(({ error: e }) => report(e, '수정'))
    },
    remove: (id) => {
      setEntries((l) => l.filter((x) => x.id !== id))
      sb.from('entries').delete().eq('id', id).then(({ error: e }) => report(e, '삭제'))
    },
    setAdCost: (month, source, amount) => {
      setAdCosts((list) => [...list.filter((x) => !(x.month === month && x.source === source)), ...(amount > 0 ? [{ month, source, amount }] : [])])
      const q = amount > 0 ? sb.from('ad_costs').upsert({ month, source, amount }) : sb.from('ad_costs').delete().eq('month', month).eq('source', source)
      q.then(({ error: e }) => report(e, '광고비 저장'))
    },
    setOptions: (kind, items) => {
      setOptionsState((o) => ({ ...o, [kind]: items }))
      sb.from('option_lists')
        .upsert({ kind, items })
        .then(({ error: e }) => report(e, '항목 저장'))
    },
  }
}

// ───────── 이 브라우저 전용 모드 ─────────
const LOCAL_KEY = 'inquiry-stats:entries-v1' // 하루 기록장 방식으로 바뀌어 새 키로 시작한다

interface LocalData {
  entries: Entry[]
  adCosts: AdCost[]
  options: OptionLists
}

function loadLocal(): LocalData {
  try {
    const v = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '')
    if (Array.isArray(v.entries) && Array.isArray(v.adCosts)) return { ...v, options: { ...DEFAULT_OPTIONS, ...v.options } }
  } catch {
    // 없거나 깨졌으면 예시로 시작
  }
  return { ...sampleData(), options: DEFAULT_OPTIONS } // 처음 열면 예시로 채워 화면을 바로 볼 수 있게 한다 (시험 모드 전용, 가상 데이터)
}

function useLocalEntries(): EntriesApi {
  const [data, setData] = useState(loadLocal)
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(data))
    } catch {
      // 저장 실패는 무시
    }
  }, [data])

  return {
    entries: data.entries,
    adCosts: data.adCosts,
    options: data.options,
    ready: true,
    error: null,
    add: (list) => setData((d) => ({ ...d, entries: [...list.map((e, k) => ({ ...e, id: crypto.randomUUID(), createdAt: Date.now() + k })), ...d.entries].sort(byNewest) })),
    update: (id, patch) => setData((d) => ({ ...d, entries: d.entries.map((x) => (x.id === id ? { ...x, ...patch } : x)).sort(byNewest) })),
    remove: (id) => setData((d) => ({ ...d, entries: d.entries.filter((x) => x.id !== id) })),
    setAdCost: (month, source, amount) =>
      setData((d) => ({
        ...d,
        adCosts: [...d.adCosts.filter((x) => !(x.month === month && x.source === source)), ...(amount > 0 ? [{ month, source, amount }] : [])],
      })),
    setOptions: (kind, items) => setData((d) => ({ ...d, options: { ...d.options, [kind]: items } })),
    replaceAll: (d) => setData((x) => ({ ...x, ...d })),
  }
}

// 빌드 시점에 한 번 정해진다.
export const useEntries: () => EntriesApi = isCloud ? useCloudEntries : useLocalEntries
