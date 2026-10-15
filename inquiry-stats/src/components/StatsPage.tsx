import { useState } from 'react'
import type { EntriesApi } from '../store/useEntries'
import { localDate } from '../inquiries'
import type { Gran, GroupKey, StatRow } from '../lib/stats'
import { GRAN_LABEL, GRAN_SPAN_LABEL, GROUP_LABEL, SMALL_N, addMonths, groupStats, inPeriod, marketing, pct, totalRow, trendWindow, won } from '../lib/stats'
import type { Route } from '../hooks/useHashRoute'
import { buildHash } from '../hooks/useHashRoute'
import { METRICS, TrendChart } from './TrendChart'
import type { Metric } from './TrendChart'

interface Props {
  api: EntriesApi
  canEditCost: boolean
  route: Route
  go: (hash: string, replace?: boolean) => void
}

const GROUP_KEYS = Object.keys(GROUP_LABEL) as GroupKey[]
const isMonth = (s?: string) => !!s && /^\d{4}-\d{2}$/.test(s)

// 비율: 분모가 작으면 흐리게 하고, 마우스를 올리면 실제 건수를 보여 준다.
function Rate({ a, b }: { a: number; b: number }) {
  if (b === 0) return <>–</>
  return (
    <span className={b < SMALL_N ? 'rate-low' : undefined} title={`${a}/${b}건${b < SMALL_N ? ' · 건수가 적어 비율이 크게 흔들릴 수 있음' : ''}`}>
      {pct(a, b)}
    </span>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="tabs tabs-small" role="tablist">
      {options.map(([k, label]) => (
        <button key={k} className={value === k ? 'on' : ''} onClick={() => onChange(k)}>
          {label}
        </button>
      ))}
    </div>
  )
}

// 이 기간 매출 순위 시상대 (2위·1위·3위) + 부문별 1위
function Podium({ rows, showCost }: { rows: StatRow[]; showCost: boolean }) {
  const byRev = rows.filter((r) => r.revenue > 0).sort((a, b) => b.revenue - a.revenue)
  if (!byRev.length) return null
  const best = (f: (r: StatRow) => number) => rows.filter((r) => f(r) > 0).sort((a, b) => f(b) - f(a))[0]
  // 가성비: 매출 중 마케팅비 비율이 가장 낮은 경로 (마케팅비가 있는 경로만)
  const value = showCost ? rows.filter((r) => r.revenue > 0 && marketing(r) > 0).sort((a, b) => marketing(a) / a.revenue - marketing(b) / b.revenue)[0] : undefined
  const topInq = best((r) => r.inquiry)
  const topTreat = best((r) => r.treatment)
  const steps = [byRev[1], byRev[0], byRev[2]]
  const places = [2, 1, 3]
  const awards: [string, StatRow | undefined, string][] = [
    ['문의왕', topInq, topInq ? `${topInq.inquiry}건` : ''],
    ['시술왕', topTreat, topTreat ? `${topTreat.treatment}건` : ''],
    ['가성비왕', value, value ? `마케팅비가 매출의 ${pct(marketing(value), value.revenue)}` : ''],
  ]
  return (
    <div className="podium-wrap">
      <div className="podium">
        {steps.map((r, k) =>
          r ? (
            <div key={r.key} className={`stand stand-${places[k]}`}>
              <span className="place">{places[k]}위</span>
              <b>{r.label}</b>
              <span className="rev">{won(r.revenue)}</span>
              <span className="block" />
            </div>
          ) : (
            <div key={`empty-${k}`} className={`stand stand-${places[k]} empty`} />
          ),
        )}
      </div>
      <div className="awards">
        {awards.map(([title, r, v]) =>
          r ? (
            <span key={title} className="award">
              <span className="award-title">{title}</span> <b>{r.label}</b> <small>{v}</small>
            </span>
          ) : null,
        )}
      </div>
    </div>
  )
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className={`tile${tone ? ` tile-${tone}` : ''}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  )
}

// rates: 비율 계산용 (에이전시를 뺀 줄). agencyKeys: 비율 대신 '에이전시'로 표시할 줄
function GroupTable({ rows, rates, agencyKeys, first, showCost }: { rows: StatRow[]; rates: Map<string, StatRow>; agencyKeys: string[]; first: string; showCost: boolean }) {
  const maxRev = Math.max(1, ...rows.map((r) => r.revenue))
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>{first}</th>
            <th className="num">문의</th>
            <th className="num">상담</th>
            <th className="num">시술</th>
            <th className="num">매출</th>
            {showCost && (
              <>
                <th className="num">마케팅비</th>
                <th className="num">매출 중 마케팅비</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>{r.label}</td>
              <td className="num">{r.inquiry}</td>
              <td className="num">
                {r.consult}{' '}
                <small className="sub">{agencyKeys.includes(r.key) ? '' : <Rate a={rates.get(r.key)?.consult ?? 0} b={rates.get(r.key)?.inquiry ?? 0} />}</small>
              </td>
              <td className="num">
                {r.treatment}{' '}
                <small className="sub">{agencyKeys.includes(r.key) ? <span className="agency-tag">에이전시</span> : <Rate a={rates.get(r.key)?.treatment ?? 0} b={rates.get(r.key)?.consult ?? 0} />}</small>
              </td>
              <td className="num bar-cell" title={`${r.label}: 매출 ${won(r.revenue)}`}>
                <span className="bar" style={{ width: `${(r.revenue / maxRev) * 55}%` }} />
                <span className="bar-num">{r.revenue ? won(r.revenue) : '–'}</span>
              </td>
              {showCost && (
                <>
                  <td className="num" title={`광고비 ${won(r.adCost ?? 0)} + 수수료 ${won(r.commission)}`}>
                    {marketing(r) ? won(Math.round(marketing(r))) : '–'}
                  </td>
                  <td className="num">{marketing(r) && r.revenue ? pct(marketing(r), r.revenue) : marketing(r) ? '매출 없음' : '–'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function StatsPage({ api, canEditCost, route, go }: Props) {
  const thisMonth = localDate().slice(0, 7)
  const q = route.query
  const from = isMonth(q.from) ? q.from : thisMonth
  const to = isMonth(q.to) && q.to >= from ? q.to : from > thisMonth ? from : thisMonth
  const gran: Gran = q.gran === 'day' || q.gran === 'week' || q.gran === 'year' ? q.gran : 'month'
  const metric: Metric = METRICS.some((m) => m.key === q.metric) ? (q.metric as Metric) : 'inquiry'
  const by: GroupKey = GROUP_KEYS.includes(q.by as GroupKey) ? (q.by as GroupKey) : 'source'
  const src = q.src ?? '' // 추이 그래프에서 고른 경로 ('' = 전체)
  const query = { from, to, gran, by, src, metric }
  const set = (patch: Partial<typeof query>) => go(buildHash(['stats'], { ...query, ...patch }), true)
  const [custom, setCustom] = useState(false)

  const period = api.entries.filter((e) => inPeriod(e.date, from, to))
  const showCost = canEditCost
  const total = totalRow(period, api.adCosts, api.rates, from, to)
  // 비율(문의→상담, 상담→시술)은 에이전시 경로를 빼고 계산한다 (에이전시 환자는 문의·상담 없이 해외에서 확정해 온다)
  const isAgency = (src: string) => api.options.agency.includes(src)
  const direct = period.filter((e) => !isAgency(e.source))
  const d = totalRow(direct, [], api.rates, from, to)
  const ag = totalRow(period.filter((e) => isAgency(e.source)), [], api.rates, from, to)
  const groups = groupStats(period, by, api.adCosts, api.rates, from, to)
  const groupRates = new Map(groupStats(direct, by, [], api.rates, from, to).map((r) => [r.key, r]))
  const bySource = by === 'source' ? groups : groupStats(period, 'source', api.adCosts, api.rates, from, to)
  // 추이는 위의 기간과 상관없이 오늘을 끝으로 (일간 30일, 주간 12주, 월간 12개월, 연간 5년)
  const trend = trendWindow(src ? api.entries.filter((e) => e.source === src) : api.entries, api.rates, gran, localDate())
  const sources = [...new Set([...api.options.source, ...api.entries.map((e) => e.source)])]
  const year = thisMonth.slice(0, 4)

  const presets: [string, string, string][] = [
    ['이번 달', thisMonth, thisMonth],
    ['지난 달', addMonths(thisMonth, -1), addMonths(thisMonth, -1)],
    ['최근 3개월', addMonths(thisMonth, -2), thisMonth],
    ['최근 12개월', addMonths(thisMonth, -11), thisMonth],
    ['올해', `${year}-01`, thisMonth],
  ]
  const isPreset = presets.some(([, f, t]) => f === from && t === to)

  return (
    <div className="stats">
      <section className="panel">
        <div className="period">
          {presets.map(([label, f, t]) => (
            <button key={label} className={`btn btn-small${f === from && t === to ? ' btn-active' : ''}`} onClick={() => set({ from: f, to: t })}>
              {label}
            </button>
          ))}
          <button className={`btn btn-small${!isPreset ? ' btn-active' : ''}`} onClick={() => setCustom(!custom)}>
            직접 선택
          </button>
        </div>
        {(custom || !isPreset) && (
          <div className="period">
            <input type="month" id="stats-from" aria-label="시작 달" value={from} onChange={(e) => e.target.value && set({ from: e.target.value, to: e.target.value > to ? e.target.value : to })} />
            <span>~</span>
            <input type="month" id="stats-to" aria-label="끝 달" value={to} onChange={(e) => e.target.value && set({ to: e.target.value, from: e.target.value < from ? e.target.value : from })} />
          </div>
        )}
        <div className="tiles tiles-4">
          <Tile label="문의" value={`${total.inquiry}건`} tone="inquiry" />
          <Tile label="상담" value={`${d.consult}건`} sub={`문의의 ${pct(d.consult, d.inquiry)}`} tone="consult" />
          <Tile label="시술" value={`${total.treatment}건`} sub={[`상담의 ${pct(d.treatment, d.consult)}`, ag.treatment ? `에이전시 ${ag.treatment}건 포함` : ''].filter(Boolean).join(' · ')} tone="treatment" />
          <Tile
            label="매출"
            value={won(total.revenue)}
            sub={[total.treatment ? `객단가 ${won(Math.round(total.revenue / total.treatment))}` : '', ag.revenue ? `에이전시 ${won(ag.revenue)}` : '', showCost && marketing(total) ? `마케팅비 ${pct(marketing(total), total.revenue)}` : ''].filter(Boolean).join(' · ') || undefined}
          />
        </div>
        <p className="help">비율은 같은 기간 건수끼리 나눈 값이라 짧은 기간에는 흔들립니다. 월 단위 이상으로 보세요. 에이전시 환자는 비율 계산에서 뺍니다.</p>
      </section>

      <section className="panel">
        <h2>이 기간 경로 순위</h2>
        {bySource.some((r) => r.revenue > 0) ? <Podium rows={bySource} showCost={showCost} /> : <p className="empty-all">이 기간 시술 매출이 없습니다.</p>}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>
            추이 <small className="sub">{GRAN_SPAN_LABEL[gran]}</small>
          </h2>
          <Segmented value={gran} options={(['day', 'week', 'month', 'year'] as Gran[]).map((g) => [g, GRAN_LABEL[g]])} onChange={(v) => set({ gran: v })} />
        </div>
        <div className="trend-controls">
          <div className="metric-tabs" role="tablist">
            {METRICS.map((m) => (
              <button key={m.key} className={`metric metric-${m.key}${metric === m.key ? ' on' : ''}`} onClick={() => set({ metric: m.key })}>
                {m.label}
              </button>
            ))}
          </div>
          <label className="src-select">
            경로
            <select id="trend-source" value={src} onChange={(e) => set({ src: e.target.value })}>
              <option value="">전체</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
        <TrendChart rows={trend} metric={metric} unitLabel={{ day: '날', week: '주', month: '달', year: '해' }[gran]} />
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>항목별</h2>
          <Segmented value={by} options={GROUP_KEYS.map((k) => [k, GROUP_LABEL[k]])} onChange={(v) => set({ by: v })} />
        </div>
        {by === 'channel' && <p className="help">문의 채널은 문의 기록에만 있어서 문의 건수만 나옵니다.</p>}
        {groups.length === 0 ? <p className="empty-all">이 기간 기록이 없습니다.</p> : <GroupTable rows={groups} rates={groupRates} agencyKeys={by === 'source' ? api.options.agency : []} first={GROUP_LABEL[by]} showCost={showCost && by === 'source'} />}
      </section>

      {canEditCost && <CostPanel api={api} />}
    </div>
  )
}

// 광고비(월별)와 수수료율(경로별) 입력. 접어 두고 필요할 때 연다.
function CostPanel({ api }: { api: EntriesApi }) {
  const [costMonth, setCostMonth] = useState(() => localDate().slice(0, 7))
  const costOf = (s: string) => api.adCosts.find((c) => c.month === costMonth && c.source === s)?.amount ?? 0
  const num = (v: string) => Math.max(0, Math.round(Number(v) || 0))
  const rate = (v: string) => Math.min(100, Math.max(0, Number(v) || 0))
  return (
    <details className="panel cost-panel">
      <summary>광고비·수수료 입력</summary>
      <p className="help">마케팅비 = 그달 광고비 + 수수료(그 경로 시술 총액 × 수수료율). 원장·실장만 봅니다.</p>
      <div className="panel-head">
        <h3>월 광고비 (만원)</h3>
        <input type="month" aria-label="광고비 달" value={costMonth} onChange={(e) => e.target.value && setCostMonth(e.target.value)} />
      </div>
      <div className="cost-grid">
        {api.options.source.map((s) => (
          <label key={`${costMonth}-${s}-${costOf(s)}`}>
            {s}
            <input type="number" inputMode="numeric" min={0} defaultValue={costOf(s) || ''} onBlur={(e) => num(e.target.value) !== costOf(s) && api.setAdCost(costMonth, s, num(e.target.value))} />
          </label>
        ))}
      </div>
      <h3>수수료율 (%)</h3>
      <p className="help">시술 후 수수료를 내는 경로만 적으세요 (기본: 메이비 30, 미뷰 40, 해외에이전시 30).</p>
      <div className="cost-grid">
        {api.options.source.map((s) => (
          <label key={`rate-${s}-${api.rates[s] ?? 0}`}>
            {s}
            <input type="number" inputMode="decimal" min={0} max={100} defaultValue={api.rates[s] || ''} onBlur={(e) => rate(e.target.value) !== (api.rates[s] ?? 0) && api.setRate(s, rate(e.target.value))} />
          </label>
        ))}
      </div>
    </details>
  )
}
