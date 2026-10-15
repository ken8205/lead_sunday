import { useEffect, useRef, useState } from 'react'
import type { StatRow } from '../lib/stats'
import { marketing, won } from '../lib/stats'

// 추이 그래프 두 개: 건수(문의·상담·시술 선)와 매출(막대). 단위가 달라 한 그래프에 섞지 않는다.
// 점·막대 위에 손가락이나 마우스를 대면 그 구간의 숫자가 나온다.

const H = 200 // 높이는 고정, 너비는 화면에 맞춘다 (글자 크기가 화면마다 달라지지 않게)
const PAD = { l: 44, r: 12, t: 12, b: 26 }
const SERIES: { key: 'inquiry' | 'consult' | 'treatment'; label: string; color: string }[] = [
  { key: 'inquiry', label: '문의', color: 'var(--c-inquiry)' },
  { key: 'consult', label: '상담', color: 'var(--c-consult)' },
  { key: 'treatment', label: '시술', color: 'var(--c-treatment)' },
]

// 눈금: 0부터 보기 좋은 간격으로 4칸쯤
function ticks(max: number): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / 4
  const p = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? p * 10
  const out: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(v)
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step)
  return out
}

const short = (label: string) => label.replace(' 주', '').replace('년', '')

function Frame({ W, rows, top, fmt, children, hover, setHover }: { W: number; rows: StatRow[]; top: number; fmt: (v: number) => string; children: (x: (i: number) => number, y: (v: number) => number, bw: number) => React.ReactNode; hover: number | null; setHover: (i: number | null) => void }) {
  const n = rows.length
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const bw = iw / Math.max(n, 1)
  const x = (i: number) => PAD.l + bw * i + bw / 2
  const y = (v: number) => PAD.t + ih - (v / top) * ih
  // 글자가 겹치지 않게 x축 이름은 듬성듬성 (이름 하나에 약 64px)
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 64))))
  const shown = new Set<number>()
  for (let i = 0; i < n; i += every) shown.add(i)
  if (!shown.has(n - 1)) {
    if ((n - 1) % every < every * 0.6) shown.delete(n - 1 - ((n - 1) % every)) // 마지막 이름과 너무 가까우면 앞의 것을 뺀다
    shown.add(n - 1)
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="chart" onMouseLeave={() => setHover(null)}>
      {ticks(top).map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="grid" />
          <text x={PAD.l - 6} y={y(v) + 4} className="axis" textAnchor="end">
            {fmt(v)}
          </text>
        </g>
      ))}
      {rows.map((r, i) =>
        shown.has(i) ? (
          <text key={r.key} x={x(i)} y={H - 8} className="axis" textAnchor="middle">
            {short(r.label)}
          </text>
        ) : null,
      )}
      {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} className="crosshair" />}
      {children(x, y, bw)}
      {rows.map((r, i) => (
        <rect key={r.key} x={PAD.l + bw * i} y={PAD.t} width={bw} height={ih} fill="transparent" onMouseEnter={() => setHover(i)} onClick={() => setHover(i)} />
      ))}
    </svg>
  )
}

export function TrendCharts({ rows, showMarketing }: { rows: StatRow[]; showMarketing: boolean }) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(600)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(Math.max(260, Math.floor(el.clientWidth / (window.innerWidth > 900 ? 2 : 1) - (window.innerWidth > 900 ? 34 : 22)))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  if (rows.length === 0) return null
  const h = hover != null ? rows[hover] : null
  const countTop = ticks(Math.max(1, ...rows.flatMap((r) => [r.inquiry, r.consult, r.treatment]))).at(-1)!
  const revTop = ticks(Math.max(1, ...rows.map((r) => r.revenue))).at(-1)!
  const fmtMoney = (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(v % 10000 ? 1 : 0)}억` : `${v.toLocaleString('ko-KR')}`)

  return (
    <div className="charts" ref={box}>
      <div className="chart-box">
        <div className="chart-head">
          <h3>건수</h3>
          <div className="legend">
            {SERIES.map((s) => (
              <span key={s.key}>
                <i style={{ background: s.color }} />
                {s.label}
              </span>
            ))}
          </div>
        </div>
        <Frame W={W} rows={rows} top={countTop} fmt={(v) => String(v)} hover={hover} setHover={setHover}>
          {(x, y) =>
            SERIES.map((s) => (
              <g key={s.key}>
                <polyline points={rows.map((r, i) => `${x(i)},${y(r[s.key])}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                {rows.length <= 16 && rows.map((r, i) => <circle key={i} cx={x(i)} cy={y(r[s.key])} r={hover === i ? 5 : 3} fill={s.color} stroke="#fff" strokeWidth={2} />)}
                {hover != null && rows.length > 16 && <circle cx={x(hover)} cy={y(rows[hover][s.key])} r={5} fill={s.color} stroke="#fff" strokeWidth={2} />}
              </g>
            ))
          }
        </Frame>
      </div>

      <div className="chart-box">
        <div className="chart-head">
          <h3>매출 (만원)</h3>
        </div>
        <Frame W={W} rows={rows} top={revTop} fmt={fmtMoney} hover={hover} setHover={setHover}>
          {(x, y, bw) =>
            rows.map((r, i) => {
              const w = Math.max(2, Math.min(36, bw * 0.6))
              const top = y(r.revenue)
              const hgt = Math.max(0, y(0) - top)
              return <path key={r.key} d={roundedTop(x(i) - w / 2, top, w, hgt)} className={`bar-rev${hover === i ? ' on' : ''}`} />
            })
          }
        </Frame>
      </div>

      <div className="chart-tip" aria-live="polite">
        {h ? (
          <>
            <b>{h.label}</b>
            {h.partial && <small> (일부)</small>} · 문의 {h.inquiry} · 상담 {h.consult} · 시술 {h.treatment} · 매출 <b>{won(h.revenue)}</b>
            {showMarketing && marketing(h) > 0 && <> · 마케팅비 {won(Math.round(marketing(h)))}</>}
          </>
        ) : (
          <span className="help">그래프 위에 손가락이나 마우스를 대면 숫자가 보입니다.</span>
        )}
      </div>
    </div>
  )
}

// 막대 윗모서리만 둥글게 (바닥은 기준선에 붙인다)
function roundedTop(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return ''
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`
}
