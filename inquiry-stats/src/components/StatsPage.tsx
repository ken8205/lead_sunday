import { useMemo, useState } from 'react'
import type { InquiriesApi } from '../store/useInquiries'
import { SOURCES, STAGE_LABEL, localDate } from '../inquiries'
import type { Gran, GroupKey, Scope, StatRow } from '../lib/stats'
import { GRAN_LABEL, GROUP_LABEL, SMALL_N, addMonths, groupStats, groupValue, inPeriod, pct, totalRow, trendStats, won } from '../lib/stats'
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

function Tiles({ t, showCost }: { t: StatRow; showCost: boolean }) {
  return (
    <div className="tiles">
      <Tile label="문의" value={`${t.total}건`} />
      <Tile label="상담 예약" value={`${t.booked}건`} sub={`문의의 ${pct(t.booked, t.total)}`} />
      <Tile label="내원 상담" value={`${t.visited}건`} sub={`문의의 ${pct(t.visited, t.total)}`} />
      <Tile label="결제" value={`${t.paid}건`} sub={`문의의 ${pct(t.paid, t.total)} · 내원의 ${pct(t.paid, t.visited)}`} />
      <Tile label="매출" value={won(t.revenue)} sub={t.paid > 0 ? `객단가 ${won(Math.round(t.revenue / t.paid))}` : undefined} />
      {showCost && t.adCost != null && (
        <Tile label="광고비" value={won(t.adCost)} sub={t.adCost > 0 ? `매출 ${(t.revenue / t.adCost).toFixed(1)}배${t.paid > 0 ? ` · 결제 1건당 ${won(Math.round(t.adCost / t.paid))}` : ''}` : undefined} />
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
            <th className="num">결제</th>
            <th className="num">결제율</th>
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
              <td className="num">{r.paid}</td>
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

  const query = { from, to, gran, by }
  const set = (patch: Partial<typeof query>) => go(buildHash(route.path, { ...query, ...patch }), true)
  const overviewHash = buildHash(['stats'], query)
  const detailHash = (b: GroupKey, v: string) => buildHash(['stats', b, v], query)

  const period = api.inquiries.filter((i) => inPeriod(i.date, from, to))
  const list = scope ? period.filter((i) => groupValue(i, scope.by) === scope.value) : period
  const showCost = canEditCost && api.adCosts.length > 0
  const total = totalRow(list, api.adCosts, from, to, scope)
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
          <input type="month" aria-label="시작 달" value={from} onChange={(e) => e.target.value && set({ from: e.target.value, to: e.target.value > to ? e.target.value : to })} />
          <span>~</span>
          <input type="month" aria-label="끝 달" value={to} onChange={(e) => e.target.value && set({ to: e.target.value, from: e.target.value < from ? e.target.value : from })} />
          {presets.map(([label, f, t]) => (
            <button key={label} className={`btn btn-small${f === from && t === to ? ' btn-active' : ''}`} onClick={() => set({ from: f, to: t })}>
              {label}
            </button>
          ))}
        </div>
        <Tiles t={total} showCost={showCost} />
        <p className="help">
          문의일 기준으로 묶습니다. 이번 달 문의가 다음 달에 결제되면 이번 달 성과로 들어가므로, 최근 기간의 결제율은 나중에 올라갈 수 있습니다. 흐린 비율은 건수가 {SMALL_N}건 미만이라 우연에 크게 흔들리는 값입니다 (마우스를 올리면 건수 표시).
        </p>
      </section>

      {!scope && (
        <section className="panel">
          <div className="panel-head">
            <h2>항목별</h2>
            <Segmented value={by} options={GROUP_KEYS.map((k) => [k, GROUP_LABEL[k]])} onChange={(v) => set({ by: v })} />
          </div>
          <p className="help">이름을 누르면 그 항목의 주별·월별·연도별 추이와 문의 목록을 볼 수 있습니다.</p>
          {period.length === 0 && by !== 'source' ? (
            <p className="empty-all">이 기간의 문의가 없습니다.</p>
          ) : (
            <StatTable rows={groupStats(period, by, api.adCosts, from, to)} first={GROUP_LABEL[by]} showCost={by === 'source' && showCost} linkFor={(r) => detailHash(by, r.key)} />
          )}
        </section>
      )}

      <section className="panel">
        <div className="panel-head">
          <h2>추이</h2>
          <Segmented value={gran} options={(['week', 'month', 'year'] as Gran[]).map((g) => [g, GRAN_LABEL[g]])} onChange={(v) => set({ gran: v })} />
        </div>
        <p className="help">
          {gran === 'week' && '주는 월요일에 시작합니다 (날짜는 그 주의 월요일). 기간 앞뒤에 걸친 주는 기간 안의 문의만 셉니다. 광고비는 월 단위라 주별에는 나오지 않습니다.'}
          {gran === 'month' && '기간을 늘리면(예: 최근 12개월) 계절에 따른 변화를 볼 수 있습니다.'}
          {gran === 'year' && '여러 해를 비교하려면 기간을 여러 해로 잡으세요. 기간이 해의 일부만 포함하면 "(일부)"로 표시합니다.'}
        </p>
        <StatTable rows={trend} first={GRAN_LABEL[gran].replace('별', '')} showCost={showCost && gran !== 'week' && (!scope || scope.by === 'source')} />
      </section>

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
      <p className="help">달마다 경로별로 쓴 광고·마케팅 비용(만원)을 적으면, 결제 1건당 광고비와 광고비 대비 매출이 나옵니다. 원장·실장만 보고 입력할 수 있습니다.</p>
      <div className="cost-grid">
        {SOURCES.filter((s) => s !== '모름').map((s) => (
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
