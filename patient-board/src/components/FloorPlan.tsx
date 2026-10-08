import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { Patient, Room } from '../types'
import { metaLine, statusLabel } from '../types'
import { elapsedMinutes, formatClock, formatTotal } from '../lib/time'
import { alertLevel, sinceOf } from '../lib/alert'
import type { AlertConfig, AlertLevel } from '../lib/alert'
import { fitText, textWidth, wrapName } from '../lib/textFit'
import { building, canvasFor } from '../data/defaultRooms'

const CARD_W = 168
const CARD_H = 78
const GAP = 6
const DRAG_THRESHOLD = 6 // px. 이보다 적게 움직이면 탭으로 본다.

interface Props {
  rooms: Room[]
  patients: Patient[]
  now: number
  alert: AlertConfig
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (patientId: string, roomId: string) => void
}

interface Placed {
  p: Patient
  x: number
  y: number
}

interface DragState {
  id: string
  x: number // 드래그 중인 카드의 왼쪽 위 (SVG 좌표)
  y: number
  overRoomId: string | null
}

const LEVEL_CLASS: Record<AlertLevel, string> = {
  none: '',
  red: ' card-alert',
  blink: ' card-alert card-blink',
  fast: ' card-alert card-blink-fast',
  green: ' card-green-alert',
}

const INNER_W = 148 // 카드 안쪽 글자 폭

// 한 줄 글자: 넘치면 글자 크기를 줄이고, 그래도 넘치면 가로로 눌러서 카드 안에 맞춘다.
function FitLine({ y, className, text, fontSize, bold = false }: { y: number; className: string; text: string; fontSize: number; bold?: boolean }) {
  const f = fitText(text, fontSize, INNER_W, 8.5, bold)
  return (
    <text x={10} y={y} className={className} style={{ fontSize: f.fontSize }} textLength={f.textLength} lengthAdjust={f.textLength ? 'spacingAndGlyphs' : undefined}>
      {text}
    </text>
  )
}

function CardBody({ p, now, alert }: { p: Patient; now: number; alert: AlertConfig }) {
  const level = alertLevel(p, now, alert)
  const red = level === 'red' || level === 'blink' || level === 'fast'
  const since = sinceOf(p)
  const label = statusLabel(p)
  const meta = metaLine(p)
  const procedure = `${p.procedure}${p.staff ? ` / ${p.staff}` : ''}`
  // 이름이 짧으면 "이름 · 상태" 한 줄. 길면 이름을 따로 (최대 2줄) 쓰고 상태는 다음 줄로 내린다.
  const compact = textWidth(`${p.name} · ${label}`, 14, true) <= INNER_W
  const wrapped = compact ? null : wrapName(p.name, p.name.length > 24 ? 12 : 14, INNER_W)
  const nameRows = wrapped ? wrapped.lines.length : 0
  const ys = compact ? [20, 37, 52, 70] : nameRows === 2 ? [15, 28, 41, 53, 70] : [17, 33, 50, 70]
  const timeY = ys[ys.length - 1]
  return (
    <>
      <rect width={CARD_W} height={CARD_H} rx={8} className={`card card-${p.status}${LEVEL_CLASS[level]}`}>
        <title>{`${p.name} · ${label}`}</title>
      </rect>
      {compact ? (
        <>
          <text x={10} y={ys[0]} className="card-name">
            {p.name} · {label}
          </text>
          <FitLine y={ys[1]} className="card-sub" text={meta} fontSize={11} />
          <FitLine y={ys[2]} className="card-sub" text={procedure} fontSize={11} />
        </>
      ) : (
        <>
          {wrapped!.lines.map((line, i) => (
            <text key={i} x={10} y={ys[i]} className="card-name" style={{ fontSize: wrapped!.fontSize }}>
              {line}
            </text>
          ))}
          <FitLine y={ys[nameRows]} className="card-sub" text={[label, meta].filter(Boolean).join(' · ')} fontSize={10.5} />
          <FitLine y={ys[nameRows + 1]} className="card-sub" text={procedure} fontSize={10.5} />
        </>
      )}
      <text x={10} y={timeY} className={`card-time${red ? ' card-time-alert' : ''}`}>
        {p.status === 'left' ? '귀가' : `${elapsedMinutes(since, now)}분`}
        <tspan className="card-clock">
          {' '}
          · {p.status === 'discharge' || p.status === 'ready' ? `${formatClock(since)}부터` : `입실 ${formatClock(p.enteredRoomAt)}`}
          {p.status !== 'left' && ` · 총 ${formatTotal(p.createdAt, now)}`}
        </tspan>
      </text>
    </>
  )
}

export function FloorPlan({ rooms, patients, now, alert, selectedId, onSelect, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; sx: number; sy: number; dx: number; dy: number; moved: boolean } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  // 터치에서는 카드에서 손을 뗀 직후 카드 밑의 방에도 click이 발생한다. 그 클릭은 무시한다.
  const lastCardUpAt = useRef(0)

  const toSvg = (e: PointerEvent) => {
    const svg = svgRef.current!
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    return pt.matrixTransform(svg.getScreenCTM()!.inverse())
  }

  const roomAt = (x: number, y: number) =>
    rooms.find((r) => !r.decor && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) ?? null

  // 방마다 카드를 입실 순서대로 격자 배치
  const placed: Placed[] = rooms.flatMap((r) => {
    const cols = Math.max(1, Math.floor((r.w - 10 + GAP) / (CARD_W + GAP)))
    return patients
      .filter((p) => p.roomId === r.id)
      .sort((a, b) => a.enteredRoomAt - b.enteredRoomAt)
      .map((p, i) => ({
        p,
        x: r.x + 6 + (i % cols) * (CARD_W + GAP),
        y: r.y + 32 + Math.floor(i / cols) * (CARD_H + GAP),
      }))
  })

  const onCardDown = (e: PointerEvent, item: Placed) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    const pt = toSvg(e)
    dragRef.current = { id: item.p.id, sx: e.clientX, sy: e.clientY, dx: pt.x - item.x, dy: pt.y - item.y, moved: false }
  }

  const onCardMove = (e: PointerEvent) => {
    const d = dragRef.current
    if (!d) return
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < DRAG_THRESHOLD) return
    d.moved = true
    const pt = toSvg(e)
    setDrag({ id: d.id, x: pt.x - d.dx, y: pt.y - d.dy, overRoomId: roomAt(pt.x, pt.y)?.id ?? null })
  }

  const onCardUp = (e: PointerEvent) => {
    const d = dragRef.current
    dragRef.current = null
    if (!d) return
    lastCardUpAt.current = Date.now()
    if (d.moved) {
      const pt = toSvg(e)
      const target = roomAt(pt.x, pt.y)
      if (target) onMove(d.id, target.id)
      setDrag(null)
    } else {
      onSelect(selectedId === d.id ? null : d.id)
    }
  }

  const onCardCancel = () => {
    dragRef.current = null
    setDrag(null)
  }

  const onRoomClick = (r: Room) => {
    if (!selectedId || r.decor) return
    if (Date.now() - lastCardUpAt.current < 150) return
    onMove(selectedId, r.id)
    onSelect(null)
  }

  const cv = canvasFor(rooms)
  const dragged = drag ? patients.find((p) => p.id === drag.id) : undefined

  return (
    <svg ref={svgRef} viewBox={`0 0 ${cv.w} ${cv.h}`} className="floorplan" role="img" aria-label="병원 평면도">
      <rect x={building.x} y={building.y} width={building.w} height={building.h} rx={18} className="building" />
      {rooms.map((r) => {
        const classes = ['room', `tone-${r.tone ?? 'clinic'}`]
        if (r.decor) classes.push('room-decor')
        else if (selectedId) classes.push('room-target')
        if (drag?.overRoomId === r.id) classes.push('room-over')
        return (
          <g key={r.id} onClick={() => onRoomClick(r)}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={12} className={classes.join(' ')} />
            <text x={r.x + 10} y={r.y + 22} className="room-name">
              {r.name}
            </text>
          </g>
        )
      })}
      {placed.map((item) => (
        <g
          key={item.p.id}
          transform={`translate(${item.x}, ${item.y})`}
          className={`card-g${selectedId === item.p.id ? ' card-selected' : ''}${drag?.id === item.p.id ? ' card-dim' : ''}`}
          onPointerDown={(e) => onCardDown(e, item)}
          onPointerMove={onCardMove}
          onPointerUp={onCardUp}
          onPointerCancel={onCardCancel}
        >
          <CardBody p={item.p} now={now} alert={alert} />
        </g>
      ))}
      {drag && dragged && (
        <g transform={`translate(${drag.x}, ${drag.y})`} className="card-ghost">
          <CardBody p={dragged} now={now} alert={alert} />
        </g>
      )}
    </svg>
  )
}
