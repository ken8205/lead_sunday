import { useState } from 'react'
import type { InquiriesApi } from '../store/useInquiries'
import { SOURCES, localDate } from '../inquiries'
import type { GroupKey, StatRow } from '../lib/stats'
import { addMonths, groupStats, inPeriod, monthStats, pct, totalRow, won } from '../lib/stats'

interface Props {
  api: InquiriesApi
  canEditCost: boolean
}

const GROUPS: [GroupKey, string][] = [
  ['source', '알게 된 경로'],
  ['channel', '문의 창구'],
  ['nationality', '국적'],
  ['interest', '관심 시술'],
  ['campaign', '광고·이벤트'],
]

function Tile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  )
}

function StatTable({ rows, first, showCost, maxTotal }: { rows: StatRow[]; first: string; showCost: boolean; maxTotal: number }) {
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
              <td>{r.key}</td>
              <td className="num bar-cell" title={`${r.key}: 문의 ${r.total}건`}>
                <span className="bar" style={{ width: `${maxTotal > 0 ? (r.total / maxTotal) * 100 : 0}%` }} />
                <span className="bar-num">{r.total}</span>
              </td>
              <td className="num">{r.booked}</td>
              <td className="num">{r.visited}</td>
              <td className="num">{r.paid}</td>
              <td className="num">{pct(r.paid, r.total)}</td>
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

export function StatsPage({ api, canEditCost }: Props) {
  const thisMonth = localDate().slice(0, 7)
  const [from, setFrom] = useState(thisMonth)
  const [to, setTo] = useState(thisMonth)
  const [by, setBy] = useState<GroupKey>('source')
  const [costMonth, setCostMonth] = useState(thisMonth)

  const list = api.inquiries.filter((i) => inPeriod(i.date, from, to))
  const total = totalRow(list, api.adCosts, from, to)
  const groups = groupStats(list, by, api.adCosts, from, to)
  const months = monthStats(api.inquiries, api.adCosts, from, to)
  const hasCost = canEditCost && api.adCosts.length > 0
  const preset = (f: string, t: string) => {
    setFrom(f)
    setTo(t)
  }
  const year = thisMonth.slice(0, 4)
  const costOf = (s: string) => api.adCosts.find((c) => c.month === costMonth && c.source === s)?.amount ?? 0

  return (
    <div className="stats">
      <section className="panel">
        <div className="period">
          <input type="month" aria-label="시작 달" value={from} onChange={(e) => e.target.value && preset(e.target.value, e.target.value > to ? e.target.value : to)} />
          <span>~</span>
          <input type="month" aria-label="끝 달" value={to} onChange={(e) => e.target.value && preset(e.target.value < from ? e.target.value : from, e.target.value)} />
          <button className="btn btn-small" onClick={() => preset(thisMonth, thisMonth)}>
            이번 달
          </button>
          <button className="btn btn-small" onClick={() => preset(addMonths(thisMonth, -1), addMonths(thisMonth, -1))}>
            지난 달
          </button>
          <button className="btn btn-small" onClick={() => preset(addMonths(thisMonth, -2), thisMonth)}>
            최근 3개월
          </button>
          <button className="btn btn-small" onClick={() => preset(`${year}-01`, thisMonth)}>
            올해
          </button>
        </div>
        <div className="tiles">
          <Tile label="문의" value={`${total.total}건`} />
          <Tile label="상담 예약" value={`${total.booked}건`} sub={`문의의 ${pct(total.booked, total.total)}`} />
          <Tile label="내원 상담" value={`${total.visited}건`} sub={`문의의 ${pct(total.visited, total.total)}`} />
          <Tile label="결제" value={`${total.paid}건`} sub={`문의의 ${pct(total.paid, total.total)} · 내원의 ${pct(total.paid, total.visited)}`} />
          <Tile label="매출" value={won(total.revenue)} sub={total.paid > 0 ? `객단가 ${won(Math.round(total.revenue / total.paid))}` : undefined} />
          {hasCost && <Tile label="광고비" value={won(total.adCost ?? 0)} sub={total.adCost ? `매출 ${(total.revenue / total.adCost).toFixed(1)}배` : undefined} />}
        </div>
        <p className="help">
          문의일 기준으로 묶습니다. 이번 달 문의가 다음 달에 결제되면 이번 달 성과로 들어가므로, 최근 달의 결제율은 나중에 올라갈 수 있습니다. 건수가 적은 항목(예: 10건 미만)의 비율은 우연에 크게 흔들리니 건수와 같이 보세요.
        </p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>항목별</h2>
          <div className="tabs" role="tablist">
            {GROUPS.map(([k, label]) => (
              <button key={k} className={by === k ? 'on' : ''} onClick={() => setBy(k)}>
                {label}
              </button>
            ))}
          </div>
        </div>
        {groups.length === 0 ? (
          <p className="empty-all">이 기간의 문의가 없습니다.</p>
        ) : (
          <StatTable rows={groups} first={GROUPS.find(([k]) => k === by)![1]} showCost={by === 'source' && hasCost} maxTotal={Math.max(...groups.map((g) => g.total))} />
        )}
      </section>

      {months.length > 1 && (
        <section className="panel">
          <h2>월별</h2>
          <StatTable rows={months} first="달" showCost={hasCost} maxTotal={Math.max(...months.map((g) => g.total))} />
        </section>
      )}

      {canEditCost && (
        <section className="panel">
          <div className="panel-head">
            <h2>광고비 입력</h2>
            <input type="month" aria-label="광고비 달" value={costMonth} onChange={(e) => e.target.value && setCostMonth(e.target.value)} />
          </div>
          <p className="help">달마다 경로별로 쓴 광고·마케팅 비용(만원)을 적으면, 위 표에 결제 1건당 광고비와 광고비 대비 매출이 나옵니다. 원장·실장만 보고 입력할 수 있습니다.</p>
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
      )}
    </div>
  )
}
