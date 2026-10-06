import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { Patient, Room } from '../types'
import { STATUS_LABEL } from '../types'
import { elapsedMinutes, formatClock } from '../lib/time'
import { building, canvas } from '../data/defaultRooms'

const CARD_W = 168
const CARD_H = 78
const GAP = 6
const DRAG_THRESHOLD = 6 // px. 이보다 적게 움직이면 탭으로 본다.

interface Props {
  rooms: Room[]
  patients: Patient[]
  now: number
  alertMin: number
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

export function isAlert(p: Patient, now: number, alertMin: number): boolean {
  return (p.status === 'waiting' || p.status === 'ready') && elapsedMinutes(p.enteredRoomAt, now) >= alertMin
}

function CardBody({ p, now, alertMin }: { p: Patient; now: number; alertMin: number }) {
  const alert = isAlert(p, now, alertMin)
  return (
    <>
      <rect width={CARD_W} height={CARD_H} rx={8} className={`card card-${p.status}${alert ? ' card-alert' : ''}`} />
      <text x={10} y={20} className="card-name">
        {p.name} · {STATUS_LABEL[p.status]}
      </text>
      <text x={10} y={37} className="card-sub">
        {p.birthDate}
      </text>
      <text x={10} y={52} className="card-sub">
        {p.procedure}
        {p.staff ? ` / ${p.staff}` : ''}
      </text>
      <text x={10} y={70} className={`card-time${alert ? ' card-time-alert' : ''}`}>
        {p.status === 'left' ? '귀가' : `${elapsedMinutes(p.enteredRoomAt, now)}분`}
        <tspan className="card-clock"> · 입실 {formatClock(p.enteredRoomAt)}</tspan>
      </text>
    </>
  )
}

export function FloorPlan({ rooms, patients, now, alertMin, selectedId, onSelect, onMove }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{ id: string; sx: number; sy: number; dx: number; dy: number; moved: boolean } | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)

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
    onMove(selectedId, r.id)
    onSelect(null)
  }

  const dragged = drag ? patients.find((p) => p.id === drag.id) : undefined

  return (
    <svg ref={svgRef} viewBox={`0 0 ${canvas.w} ${canvas.h}`} className="floorplan" role="img" aria-label="병원 평면도">
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
          <CardBody p={item.p} now={now} alertMin={alertMin} />
        </g>
      ))}
      {drag && dragged && (
        <g transform={`translate(${drag.x}, ${drag.y})`} className="card-ghost">
          <CardBody p={dragged} now={now} alertMin={alertMin} />
        </g>
      )}
    </svg>
  )
}
