import { useMemo, useState } from 'react'
import type { EntriesApi } from '../store/useEntries'
import type { Entry } from '../inquiries'
import { KIND_LABEL, localDate } from '../inquiries'
import type { Gran, GroupKey, Scope, StatRow } from '../lib/stats'
import { GRAN_LABEL, GROUP_LABEL, SMALL_N, addMonths, groupStats, groupValue, inPeriod, pct, totalRow, trendStats, won } from '../lib/stats'
import type { Route } from '../hooks/useHashRoute'
import { buildHash } from '../hooks/useHashRoute'

interface Props {
  api: EntriesApi
  canEditCost: boolean
  route: Route // path: ['stats'] 또는 ['stats', 항목, 값]
  go: (hash: string, replace?: boolean) => void
}

const GROUP_KEYS = Object.keys(GROUP_LABEL) as GroupKey[]
const isMonth = (s?: string) => !!s && /^\d{4}-\d{2}$/.test(s)
const isDay = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)
const dayTitle = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 (${'일월화수목금토'[new Date(`${d}T00:00:00`).getDay()]})`

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  )
}

// 비율: 분모가 작으면 흐리게 하고, 마우스를 올리면 실제 건수를 보여 준다.
function Rate({ a, b }: { a: number; b: number }) {
  if (b === 0) return <>–</>
  return (
    <span className={b < SMALL_N ? 'rate-low' : undefined} title={`${a}/${b}건${b < SMALL_N ? ' · 건수가 적어 비율이 크게 흔들릴 수 있음' : ''}`}>
      {pct(a, b)}
    </span>
  )
}

// 문의 → 상담 → 시술: 같은 기간의 카드 수를 막대로. 비율은 같은 기간 건수끼리 나눈 것 (같은 사람끼리 이은 숫자가 아님)
function Funnel({ t }: { t: StatRow }) {
  const steps: [string, number, string][] = [
    ['문의', t.inquiry, ''],
    ['상담', t.consult, pct(t.consult, t.inquiry)],
    ['시술', t.treatment, pct(t.treatment, t.consult)],
  ]
  const max = Math.max(1, t.inquiry, t.consult, t.treatment)
  return (
    <div className="funnel" role="img" aria-label={steps.map(([l, n]) => `${l} ${n}건`).join(', ')}>
      {steps.map(([label, n, rate], k) => (
        <div className="f-row" key={label}>
          <span className="f-label">{label}</span>
          <span className="f-track">
            <span className={`f-bar f-bar-${k * 2}`} style={{ width: `${Math.max((n / max) * 100, n ? 2 : 0)}%` }} />
          </span>
          <span className="f-num">
            <b>{n}</b>건{rate && <small> {k === 1 ? '문의의' : '상담의'} {rate}</small>}
          </span>
        </div>
      ))}
    </div>
  )
}

function Tiles({ t, showCost, dayMode }: { t: StatRow; showCost: boolean; dayMode: boolean }) {
  return (
    <div className="summary-grid">
      <Funnel t={t} />
      <div className="tiles">
        <Tile label={dayMode ? '이날 매출' : '매출'} value={won(t.revenue)} sub={t.treatment > 0 ? `시술 ${t.treatment}건 · 객단가 ${won(Math.round(t.revenue / t.treatment))}` : '시술 총액 합'} />
        <Tile label="상담 → 시술" value={pct(t.treatment, t.consult)} sub={`문의 → 상담 ${pct(t.consult, t.inquiry)}`} />
        {showCost && t.adCost != null && (
          <Tile label="광고비" value={won(t.adCost)} sub={t.adCost > 0 ? `매출 ${(t.revenue / t.adCost).toFixed(1)}배${t.treatment > 0 ? ` · 시술 1건당 ${won(Math.round(t.adCost / t.treatment))}` : ''}` : undefined} />
        )}
      </div>
    </div>
  )
}

// 이 기간의 1위
function Podium({ rows, linkFor }: { rows: StatRow[]; linkFor: (r: StatRow) => string }) {
  const best = (f: (r: StatRow) => number) => rows.filter((r) => f(r) > 0).sort((a, b) => f(b) - f(a))[0]
  const items: [string, StatRow | undefined, (r: StatRow) => string][] = [
    ['문의 1위', best((r) => r.inquiry), (r) => `${r.inquiry}건`],
    ['시술 1위', best((r) => r.treatment), (r) => `${r.treatment}건`],
    ['매출 1위', best((r) => r.revenue), (r) => won(r.revenue)],
  ]
  if (!items.some(([, r]) => r)) return null
  return (
    <div className="podium">
      {items.map(([label, r, v]) =>
        r ? (
          <a key={label} className="medal" href={linkFor(r)}>
            <span className="medal-label">{label}</span>
            <b>{r.label}</b>
            <span className="medal-value">{v(r)}</span>
          </a>
        ) : null,
      )}
    </div>
  )
}

function StatTable({ rows, first, showCost, linkFor }: { rows: StatRow[]; first: string; showCost: boolean; linkFor?: (r: StatRow) => string }) {
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
            <th className="num">문의 → 상담</th>
            <th className="num">상담 → 시술</th>
            <th className="num">매출</th>
            <th className="num">객단가</th>
            {showCost && (
              <>
                <th className="num">광고비</th>
                <th className="num">시술 1건당 광고비</th>
                <th className="num">광고비 대비 매출</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <td>
                {linkFor ? (
                  <a className="drill" href={linkFor(r)}>
                    {r.label} ›
                  </a>
                ) : (
                  r.label
                )}
                {r.partial && <small className="sub"> (일부)</small>}
              </td>
              <td className="num">{r.inquiry}</td>
              <td className="num">{r.consult}</td>
              <td className="num">{r.treatment}</td>
              <td className="num">
                <Rate a={r.consult} b={r.inquiry} />
              </td>
              <td className="num">
                <Rate a={r.treatment} b={r.consult} />
              </td>
              <td className="num bar-cell" title={`${r.label}: 매출 ${won(r.revenue)}`}>
                <span className="bar" style={{ width: `${(r.revenue / maxRev) * 100}%` }} />
                <span className="bar-num">{r.revenue ? won(r.revenue) : '–'}</span>
              </td>
              <td className="num">{r.treatment > 0 && r.revenue ? won(Math.round(r.revenue / r.treatment)) : '–'}</td>
              {showCost && (
                <>
                  <td className="num">{r.adCost ? won(r.adCost) : '–'}</td>
                  <td className="num">{r.adCost && r.treatment > 0 ? won(Math.round(r.adCost / r.treatment)) : '–'}</td>
                  <td className="num">{r.adCost ? `${(r.revenue / r.adCost).toFixed(1)}배` : '–'}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

export function StatsPage({ api, canEditCost, route, go }: Props) {
  const thisMonth = localDate().slice(0, 7)
  const q = route.query
  const from = isMonth(q.from) ? q.from : thisMonth
  const to = isMonth(q.to) && q.to >= from ? q.to : from > thisMonth ? from : thisMonth
  const gran: Gran = q.gran === 'week' || q.gran === 'year' ? q.gran : 'month'
  const by: GroupKey = GROUP_KEYS.includes(q.by as GroupKey) ? (q.by as GroupKey) : 'source'
  const [, detailBy, detailValue] = route.path
  const scope: Scope | undefined = GROUP_KEYS.includes(detailBy as GroupKey) && detailValue ? { by: detailBy as GroupKey, value: detailValue } : undefined

  const today = localDate()
  const day = isDay(q.day) ? q.day : undefined // 하루만 볼 때 (오늘·어제 등)
  const yesterday = localDate(new Date(Date.now() - 86400000))

  const query: { from: string; to: string; gran: Gran; by: GroupKey; day?: string } = { from, to, gran, by, day }
  const set = (patch: Partial<typeof query>) => go(buildHash(route.path, { ...query, ...patch }), true)
  const overviewHash = buildHash(['stats'], query)
  const detailHash = (b: GroupKey, v: string) => buildHash(['stats', b, v], query)

  const period = api.entries.filter((e) => (day ? e.date === day : inPeriod(e.date, from, to)))
  const list = scope ? period.filter((i) => groupValue(i, scope.by) === scope.value) : period
  const costs = day ? [] : api.adCosts // 광고비는 월 단위라 하루 통계에는 쓰지 않는다
  const showCost = !day && canEditCost && api.adCosts.length > 0
  const total = totalRow(list, costs, from, to, scope)
  const trend = trendStats(list, api.adCosts, from, to, gran, scope)
  const year = thisMonth.slice(0, 4)
  const lastYear = String(Number(year) - 1)

  const presets: [string, string, string][] = [
    ['이번 달', thisMonth, thisMonth],
    ['지난 달', addMonths(thisMonth, -1), addMonths(thisMonth, -1)],
    ['최근 3개월', addMonths(thisMonth, -2), thisMonth],
    ['최근 12개월', addMonths(thisMonth, -11), thisMonth],
    ['올해', `${year}-01`, thisMonth],
    ['작년', `${lastYear}-01`, `${lastYear}-12`],
  ]

  return (
    <div className="stats">
      {scope && (
        <div className="crumbs">
          <a className="btn btn-small" href={overviewHash}>
            ‹ 전체 통계
          </a>
          <h2>
            <small>{GROUP_LABEL[scope.by]}</small> {scope.value}
          </h2>
        </div>
      )}

      <section className="panel">
        <div className="period">
          <button className={`btn btn-small${day === today ? ' btn-active' : ''}`} onClick={() => set({ day: today })}>
            오늘
          </button>
          <button className={`btn btn-small${day === yesterday ? ' btn-active' : ''}`} onClick={() => set({ day: yesterday })}>
            어제
          </button>
          <input type="date" id="stats-day" aria-label="하루 고르기" className={day ? 'on' : ''} value={day ?? ''} max={today} onChange={(e) => set({ day: e.target.value || undefined })} />
          <span className="period-sep" aria-hidden="true" />
          <input type="month" id="stats-from" aria-label="시작 달" className={day ? 'dim' : ''} value={from} onChange={(e) => e.target.value && set({ day: undefined, from: e.target.value, to: e.target.value > to ? e.target.value : to })} />
          <span>~</span>
          <input type="month" id="stats-to" aria-label="끝 달" className={day ? 'dim' : ''} value={to} onChange={(e) => e.target.value && set({ day: undefined, to: e.target.value, from: e.target.value < from ? e.target.value : from })} />
          {presets.map(([label, f, t]) => (
            <button key={label} className={`btn btn-small${!day && f === from && t === to ? ' btn-active' : ''}`} onClick={() => set({ day: undefined, from: f, to: t })}>
              {label}
            </button>
          ))}
        </div>
        {day && <h2 className="day-title">{day === today ? '오늘' : day === yesterday ? '어제' : ''} {dayTitle(day)}</h2>}
        <Tiles t={total} showCost={showCost} dayMode={!!day} />
        <details className="fine">
          <summary>숫자 읽는 법</summary>
          <ul>
            <li>모든 숫자는 그 일이 일어난 날 기준입니다. 문의는 처음 연락 온 날, 상담은 상담한 날, 시술은 시술한 날.</li>
            <li>매출은 시술 카드의 총액 합입니다(발생주의). 예약금은 매출이 아니고, 수술 예약 후 취소는 시술 카드가 생기지 않으니 매출에 들어가지 않습니다.</li>
            <li>문의 → 상담 = 상담 ÷ 문의, 상담 → 시술 = 시술 ÷ 상담. 같은 기간의 건수끼리 나눈 값이라 같은 사람을 이어서 센 숫자는 아닙니다. 9월 문의 → 10월 수술처럼 시차가 있어 주 단위로는 흔들리고, 월 단위 이상이면 대체로 맞습니다.</li>
            <li>문의 채널은 문의 카드에만 있어서, 채널별 표에는 문의 건수만 나옵니다.</li>
            <li>흐린 비율은 건수가 {SMALL_N}건 미만이라 우연에 크게 흔들리는 값입니다. 마우스를 올리면 건수가 보입니다.</li>
          </ul>
        </details>
      </section>

      {!scope && (
        <section className="panel">
          <div className="panel-head">
            <h2>항목별</h2>
            <Segmented value={by} options={GROUP_KEYS.map((k) => [k, GROUP_LABEL[k]])} onChange={(v) => set({ by: v })} />
          </div>
          {(() => {
            const rows = groupStats(period, by, costs, from, to)
            return <Podium rows={rows} linkFor={(r) => detailHash(by, r.key)} />
          })()}
          <p className="help">이름을 누르면 상세 페이지로 갑니다.</p>
          {period.length === 0 && (by !== 'source' || day) ? (
            <p className="empty-all">{day ? '이날 기록이 없습니다.' : '이 기간 기록이 없습니다.'}</p>
          ) : (
            <StatTable rows={groupStats(period, by, costs, from, to)} first={GROUP_LABEL[by]} showCost={by === 'source' && showCost} linkFor={(r) => detailHash(by, r.key)} />
          )}
        </section>
      )}

      {!day && (
      <section className="panel">
        <div className="panel-head">
          <h2>추이</h2>
          <Segmented value={gran} options={(['week', 'month', 'year'] as Gran[]).map((g) => [g, GRAN_LABEL[g]])} onChange={(v) => set({ gran: v })} />
        </div>
        {gran === 'week' && <p className="help">주는 월요일 시작. 광고비는 월 단위라 주별에는 없습니다.</p>}
        <StatTable rows={trend} first={GRAN_LABEL[gran].replace('별', '')} showCost={showCost && gran !== 'week' && (!scope || scope.by === 'source')} />
      </section>
      )}

      {scope && <DetailBreakdown list={list} scope={scope} detailHash={detailHash} from={from} to={to} />}

      {!scope && canEditCost && <AdCostPanel api={api} />}
    </div>
  )
}

// 상세 페이지 아래쪽: 다른 항목으로 나눠 보기 + 카드 목록
function DetailBreakdown({ list, scope, detailHash, from, to }: { list: Entry[]; scope: Scope; detailHash: (b: GroupKey, v: string) => string; from: string; to: string }) {
  const others = GROUP_KEYS.filter((k) => k !== scope.by)
  const [by, setBy] = useState<GroupKey>(scope.by === 'interest' ? 'source' : 'interest')
  const rows = useMemo(() => groupStats(list, by, [], from, to), [list, by, from, to])
  return (
    <>
      <section className="panel">
        <div className="panel-head">
          <h2>나눠 보기</h2>
          <Segmented value={by} options={others.map((k) => [k, GROUP_LABEL[k]])} onChange={setBy} />
        </div>
        {rows.length === 0 ? <p className="empty-all">이 기간 기록이 없습니다.</p> : <StatTable rows={rows} first={GROUP_LABEL[by]} showCost={false} linkFor={(r) => detailHash(by, r.key)} />}
      </section>
      <section className="panel">
        <h2>카드 목록 ({list.length}장)</h2>
        {list.length === 0 ? (
          <p className="empty-all">이 기간 기록이 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>종류</th>
                  {others.map((k) => (
                    <th key={k}>{GROUP_LABEL[k]}</th>
                  ))}
                  <th className="num">총액</th>
                  <th>이름·메모</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 300).map((e) => (
                  <tr key={e.id}>
                    <td className="num">{e.date}</td>
                    <td>{KIND_LABEL[e.kind]}</td>
                    {others.map((k) => (
                      <td key={k}>{e[k]}</td>
                    ))}
                    <td className="num">{e.amount != null ? e.amount.toLocaleString('ko-KR') : ''}</td>
                    <td>{[e.patientName, e.note].filter(Boolean).join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

function AdCostPanel({ api }: { api: EntriesApi }) {
  const [costMonth, setCostMonth] = useState(() => localDate().slice(0, 7))
  const costOf = (s: string) => api.adCosts.find((c) => c.month === costMonth && c.source === s)?.amount ?? 0
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>광고비 입력</h2>
        <input type="month" aria-label="광고비 달" value={costMonth} onChange={(e) => e.target.value && setCostMonth(e.target.value)} />
      </div>
      <p className="help">경로별로 그달 쓴 비용(만원)을 적으세요. 원장·실장만 봅니다.</p>
      <div className="cost-grid">
        {api.options.source.map((s) => (
          <label key={`${costMonth}-${s}-${costOf(s)}`}>
            {s}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              defaultValue={costOf(s) || ''}
              onBlur={(e) => {
                const v = Math.max(0, Math.round(Number(e.target.value) || 0))
                if (v !== costOf(s)) api.setAdCost(costMonth, s, v)
              }}
            />
          </label>
        ))}
      </div>
    </section>
  )
}
