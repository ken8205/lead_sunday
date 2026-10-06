import type { Patient, Room } from '../types'
import { STATUS_LABEL } from '../types'
import { elapsedMinutes } from '../lib/time'
import { building, canvas } from '../data/defaultRooms'

const CARD_W = 168
const CARD_H = 62
const GAP = 6

interface Props {
  rooms: Room[]
  patients: Patient[]
}

export function FloorPlan({ rooms, patients }: Props) {
  return (
    <svg viewBox={`0 0 ${canvas.w} ${canvas.h}`} className="floorplan" role="img" aria-label="병원 평면도">
      <rect x={building.x} y={building.y} width={building.w} height={building.h} className="building" />
      {rooms.map((r) => {
        const cols = Math.max(1, Math.floor((r.w - 10 + GAP) / (CARD_W + GAP)))
        const inRoom = patients.filter((p) => p.roomId === r.id)
        return (
          <g key={r.id}>
            <rect x={r.x} y={r.y} width={r.w} height={r.h} rx={6} className={r.decor ? 'room room-decor' : 'room'} />
            <text x={r.x + 10} y={r.y + 22} className="room-name">
              {r.name}
            </text>
            {inRoom.map((p, i) => {
              const col = i % cols
              const row = Math.floor(i / cols)
              return (
                <g
                  key={p.id}
                  transform={`translate(${r.x + 6 + col * (CARD_W + GAP)}, ${r.y + 32 + row * (CARD_H + GAP)})`}
                >
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
              )
            })}
          </g>
        )
      })}
    </svg>
  )
}
