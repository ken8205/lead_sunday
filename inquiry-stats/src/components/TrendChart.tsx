import { useEffect, useRef, useState } from 'react'
import type { StatRow } from '../lib/stats'
import { won } from '../lib/stats'

// 추이 그래프: 한 번에 한 가지(문의·상담·시술·매출)만 막대로 크게. 막대 위에 숫자를 적는다.
// 마지막 막대(오늘·이번 주·이번 달·올해)는 아직 진행 중이라 연하게.

export type Metric = 'inquiry' | 'consult' | 'treatment' | 'revenue'
export const METRICS: { key: Metric; label: string; unit: string; color: string }[] = [
  { key: 'inquiry', label: '문의', unit: '건', color: 'var(--c-inquiry)' },
  { key: 'consult', label: '상담', unit: '건', color: 'var(--c-consult)' },
  { key: 'treatment', label: '시술', unit: '건', color: 'var(--c-treatment)' },
  { key: 'revenue', label: '매출', unit: '만원', color: 'var(--c-revenue)' },
]

const H = 240
const PAD = { l: 8, r: 8, t: 22, b: 24 }

const fmt = (m: Metric, v: number) => (m === 'revenue' ? (v >= 10000 ? `${(v / 10000).toFixed(1)}억` : v.toLocaleString('ko-KR')) : String(v))

export function TrendChart({ rows, metric, unitLabel }: { rows: StatRow[]; metric: Metric; unitLabel: string }) {
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  const [hover, setHover] = useState<number | null>(null)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, Math.floor(el.clientWidth))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const m = METRICS.find((x) => x.key === metric)!
  const vals = rows.map((r) => r[metric])
  const max = Math.max(1, ...vals)
  const n = rows.length
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const bw = iw / n
  const barW = Math.max(3, Math.min(44, bw * 0.68))
  const x = (i: number) => PAD.l + bw * i + bw / 2
  const y = (v: number) => PAD.t + ih - (v / max) * ih
  const showAllValues = bw >= 26 // 막대가 넓으면 모든 막대에 숫자, 좁으면 가장 큰 값과 마지막만
  const maxIdx = vals.indexOf(Math.max(...vals))
  const labelEvery = Math.max(1, Math.ceil(n / Math.floor(iw / 44)))

  // 직전 구간과 비교: 진행 중인 마지막 구간은 빼고, 다 끝난 마지막 두 구간을 비교한다
  const last = rows[n - 2]
  const prev = rows[n - 3]
  const diff = last && prev && (last[metric] || prev[metric]) ? last[metric] - prev[metric] : null
  const h = hover != null ? rows[hover] : null

  return (
    <div className="trend" ref={box}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="chart" onMouseLeave={() => setHover(null)} role="img" aria-label={`${m.label} ${unitLabel} 추이`}>
        <line x1={PAD.l} x2={W - PAD.r} y1={y(0)} y2={y(0)} className="baseline" />
        {rows.map((r, i) => {
          const v = r[metric]
          const top = y(v)
          const hgt = y(0) - top
          return (
            <g key={r.key}>
              {hgt > 0 && <path d={roundedTop(x(i) - barW / 2, top, barW, hgt)} fill={m.color} opacity={r.partial ? 0.35 : hover === i ? 1 : 0.88} />}
              {(showAllValues || i === maxIdx || i === n - 1 || hover === i) && v > 0 && (
                <text x={x(i)} y={top - 6} className="val" textAnchor="middle">
                  {fmt(metric, v)}
                </text>
              )}
              {((i % labelEvery === 0 && (n - 1 - i >= labelEvery * 0.6 || i === n - 1)) || i === n - 1) && (
                <text x={x(i)} y={H - 6} className="axis" textAnchor="middle">
                  {r.label}
                </text>
              )}
              <rect x={PAD.l + bw * i} y={PAD.t} width={bw} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
            </g>
          )
        })}
      </svg>
      <div className="chart-tip" aria-live="polite">
        {h ? (
          <>
            <b>{h.label}</b>
            {h.partial && <small> (진행 중)</small>} · 문의 {h.inquiry} · 상담 {h.consult} · 시술 {h.treatment} · 매출 <b>{won(h.revenue)}</b>
          </>
        ) : diff != null ? (
          <>
            직전 {unitLabel} 대비{' '}
            <b className={diff > 0 ? 'up' : diff < 0 ? 'down' : undefined}>
              {diff > 0 ? '▲' : diff < 0 ? '▼' : ''} {fmt(metric, Math.abs(diff))}
              {m.unit}
              {prev[metric] > 0 && ` (${diff > 0 ? '+' : diff < 0 ? '−' : ''}${Math.round((Math.abs(diff) / prev[metric]) * 100)}%)`}
            </b>{' '}
            <small>
              {last.label} {fmt(metric, last[metric])}
              {m.unit} · {prev.label} {fmt(metric, prev[metric])}
              {m.unit}
            </small>
          </>
        ) : null}
      </div>
      <p className="help">연한 막대는 아직 진행 중인 구간입니다. 막대를 누르면 그 구간의 숫자가 모두 나옵니다.</p>
    </div>
  )
}

// 막대 윗모서리만 둥글게 (바닥은 기준선에 붙인다)
function roundedTop(x: number, y: number, w: number, h: number): string {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
