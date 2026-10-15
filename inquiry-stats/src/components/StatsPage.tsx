import { useMemo, useState } from 'react'
import type { InquiriesApi } from '../store/useInquiries'
import { STAGE_LABEL, localDate } from '../inquiries'
import type { Gran, GroupKey, Scope, StatRow } from '../lib/stats'
import type { Activity } from '../lib/stats'
import { GRAN_LABEL, GROUP_LABEL, SMALL_N, addMonths, activityIn, lastDayOfMonth, groupStats, groupValue, inPeriod, pct, totalRow, trendStats, won } from '../lib/stats'
import type { Route } from '../hooks/useHashRoute'
import { buildHash } from '../hooks/useHashRoute'

interface Props {
  api: InquiriesApi
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

// 문의 → 예약 → 내원 → 결제: 단계마다 얼마나 남는지 막대 길이로 보여 준다.
function Funnel({ t }: { t: StatRow }) {
  const steps: [string, number][] = [
    ['문의', t.total],
    ['상담 예약', t.booked],
    ['내원 상담', t.visited],
    ['수술 예약', t.reserved],
    ['결제 완료', t.paid],
  ]
  return (
    <div className="funnel" role="img" aria-label={steps.map(([l, n]) => `${l} ${n}건`).join(', ') + `, 취소 ${t.canceled}건`}>
      {steps.map(([label, n], k) => (
        <div className="f-row" key={label}>
          <span className="f-label">{label}</span>
          <span className="f-track">
            <span className={`f-bar f-bar-${k}`} style={{ width: `${t.total ? Math.max((n / t.total) * 100, n ? 2 : 0) : 0}%` }} />
          </span>
          <span className="f-num">
            <b>{n}</b>건{k > 0 && <small> {pct(n, t.total)}</small>}
          </span>
        </div>
      ))}
      <p className="f-note">
        수술 예약 후 취소 <b>{t.canceled}</b>건 · 각 단계는 그 단계까지 간 건수입니다(수술 예약에는 이후 결제 완료·취소 건, 당일 전액 결제 건도 포함). 결제 완료는 완불한 건만 셉니다.
      </p>
    </div>
  )
}

function Tiles({ t, showCost, act: a, dayMode }: { t: StatRow; showCost: boolean; act: Activity; dayMode: boolean }) {
  return (
    <>
    <div className="activity" aria-label={dayMode ? '이날 한 일' : '이 기간 한 일'}>
      <span className="activity-title">{dayMode ? '이날 한 일' : '이 기간 한 일'}</span>
      {(
        [
          ['문의', a.inquiry],
          ['상담 예약', a.booked],
          ['내원 상담', a.visited],
          ['수술 예약', a.reserved],
          ['결제 완료', a.paid],
          ['취소', a.canceled],
        ] as [string, number][]
      ).map(([l, n]) => (
        <span key={l} className="act">
          {l} <b>{n}</b>
        </span>
      ))}
    </div>
    <div className="summary-grid">
      <Funnel t={t} />
      <div className="tiles">
        <Tile label="문의 → 결제" value={pct(t.paid, t.total)} sub={`상담 → 결제 ${pct(t.paid, t.visited)} (${t.paid}/${t.visited}건)`} />
        <Tile label="결제 완료 매출" value={won(t.revenue)} sub={t.paid > 0 ? `${t.paid}건 · 객단가 ${won(Math.round(t.revenue / t.paid))}` : '이 기간 문의 중 완불한 건의 총액'} />
        {showCost && t.adCost != null && (
          <Tile label="광고비" value={won(t.adCost)} sub={t.adCost > 0 ? `매출 ${(t.revenue / t.adCost).toFixed(1)}배${t.paid > 0 ? ` · 결제 1건당 ${won(Math.round(t.adCost / t.paid))}` : ''}` : undefined} />
        )}
      </div>
    </div>
    </>
  )
}

// 이 기간의 1위: 문의가 가장 많은 경로, 결제가 가장 많은 경로, 매출이 가장 큰 경로
function Podium({ rows, linkFor }: { rows: StatRow[]; linkFor: (r: StatRow) => string }) {
  const best = (f: (r: StatRow) => number) => rows.filter((r) => f(r) > 0).sort((a, b) => f(b) - f(a))[0]
  const items: [string, StatRow | undefined, (r: StatRow) => string][] = [
    ['문의 1위', best((r) => r.total), (r) => `${r.total}건`],
    ['결제 1위', best((r) => r.paid), (r) => `${r.paid}건`],
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
  const maxTotal = Math.max(1, ...rows.map((r) => r.total))
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th>{first}</th>
            <th className="num">문의</th>
            <th className="num">예약</th>
            <th className="num">내원</th>
            <th className="num">수술 예약</th>
            <th className="num">결제 완료</th>
            <th className="num">취소</th>
            <th className="num">문의 → 결제</th>
            <th className="num">매출</th>
            <th className="num">객단가</th>
            {showCost && (
              <>
                <th className="num">광고비</th>
                <th className="num">결제 1건당 광고비</th>
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
              <td className="num bar-cell" title={`${r.label}: 문의 ${r.total}건`}>
                <span className="bar" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                <span className="bar-num">{r.total}</span>
              </td>
              <td className="num">{r.booked}</td>
              <td className="num">{r.visited}</td>
              <td className="num">{r.reserved}</td>
              <td className="num">{r.paid}</td>
              <td className="num">{r.canceled || ''}</td>
              <td className="num">
                <Rate a={r.paid} b={r.total} />
              </td>
              <td className="num">{r.revenue ? won(r.revenue) : '–'}</td>
              <td className="num">{r.paid > 0 && r.revenue ? won(Math.round(r.revenue / r.paid)) : '–'}</td>
              {showCost && (
                <>
                  <td className="num">{r.adCost ? won(r.adCost) : '–'}</td>
                  <td className="num">{r.adCost && r.paid > 0 ? won(Math.round(r.adCost / r.paid)) : '–'}</td>
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

  const period = api.inquiries.filter((i) => (day ? i.date === day : inPeriod(i.date, from, to)))
  const list = scope ? period.filter((i) => groupValue(i, scope.by) === scope.value) : period
  const costs = day ? [] : api.adCosts // 광고비는 월 단위라 하루 통계에는 쓰지 않는다
  const showCost = !day && canEditCost && api.adCosts.length > 0
  const total = totalRow(list, costs, from, to, scope)
  // 한 일: 단계가 실제로 일어난 날 기준 (문의일과 상관없이)
  const inScope = scope ? api.inquiries.filter((i) => groupValue(i, scope.by) === scope.value) : api.inquiries
  const act = day ? activityIn(inScope, day, day) : activityIn(inScope, `${from}-01`, lastDayOfMonth(to))
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
        <Tiles t={total} showCost={showCost} act={act} dayMode={!!day} />
        <details className="fine">
          <summary>숫자 읽는 법</summary>
          <ul>
            <li>깔때기·매출·항목별 표는 문의한 날짜로 묶습니다. 매출은 결제 완료한 건의 총액입니다. 이번 달 문의가 다음 달에 결제되면 이번 달 성과로 들어가서, 최근 기간 결제율은 나중에 올라갈 수 있습니다.</li>
            <li>"한 일"은 그 단계가 실제로 일어난 날 기준입니다. 예: 지난주 문의한 환자가 오늘 내원하면 오늘의 내원 상담 1건.</li>
            <li>문의 → 결제 = 결제 완료 ÷ 문의, 상담 → 결제 = 결제 완료 ÷ 내원 상담.</li>
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
            <p className="empty-all">{day ? '이날 들어온 문의가 없습니다.' : '이 기간의 문의가 없습니다.'}</p>
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

// 상세 페이지 아래쪽: 다른 항목으로 나눠 보기 + 문의 목록
function DetailBreakdown({ list, scope, detailHash, from, to }: { list: StatsPageList; scope: Scope; detailHash: (b: GroupKey, v: string) => string; from: string; to: string }) {
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
        {rows.length === 0 ? <p className="empty-all">이 기간의 문의가 없습니다.</p> : <StatTable rows={rows} first={GROUP_LABEL[by]} showCost={false} linkFor={(r) => detailHash(by, r.key)} />}
      </section>
      <section className="panel">
        <h2>문의 목록 ({list.length}건)</h2>
        {list.length === 0 ? (
          <p className="empty-all">이 기간의 문의가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>문의일</th>
                  {others.map((k) => (
                    <th key={k}>{GROUP_LABEL[k]}</th>
                  ))}
                  <th>단계</th>
                  <th className="num">금액</th>
                  <th>메모</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr key={i.id}>
                    <td className="num">{i.date}</td>
                    {others.map((k) => (
                      <td key={k}>{i[k]}</td>
                    ))}
                    <td>{STAGE_LABEL[i.stage]}</td>
                    <td className="num">{i.amount != null ? i.amount.toLocaleString('ko-KR') : ''}</td>
                    <td>{i.note}</td>
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
type StatsPageList = InquiriesApi['inquiries']

function AdCostPanel({ api }: { api: InquiriesApi }) {
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
