import type { Patient, Room } from '../types'
import { STATUS_LABEL } from '../types'
import { elapsedMinutes } from '../lib/time'

const CARD_W = 180
const CARD_H = 62

interface Props {
  rooms: Room[]
  patients: Patient[]
}

export function FloorPlan({ rooms, patients }: Props) {
  return (
    <svg viewBox="0 0 1000 640" className="floorplan" role="img" aria-label="병원 평면도">
      {rooms.map((r) => (
        <g key={r.id}>
          <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={10} className="room" />
          <text x={r.x + 12} y={r.y + 24} className="room-name">
            {r.name}
          </text>
          {patients
            .filter((p) => p.roomId === r.id)
            .map((p, i) => (
              <g key={p.id} transform={`translate(${r.x + 10}, ${r.y + 36 + i * (CARD_H + 6)})`}>
                <rect width={CARD_W} height={CARD_H} rx={8} className={`card card-${p.status}`} />
                <text x={10} y={20} className="card-name">
                  {p.name} · {STATUS_LABEL[p.status]}
                </text>
                <text x={10} y={38} className="card-sub">
                  {p.birthDate} · {elapsedMinutes(p.enteredRoomAt)}분
                </text>
                <text x={10} y={54} className="card-sub">
                  {p.procedure} / {p.staff}
                </text>
              </g>
            ))}
        </g>
      ))}
    </svg>
  )
}
