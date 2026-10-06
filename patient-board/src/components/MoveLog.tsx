import type { Move, Patient, Room } from '../types'
import { formatClock } from '../lib/time'

interface Props {
  moves: Move[]
  patients: Patient[]
  rooms: Room[]
}

export function MoveLog({ moves, patients, rooms }: Props) {
  const roomName = (id: string | null) => (id ? (rooms.find((r) => r.id === id)?.name ?? '?') : '신규')
  const recent = moves.slice(-10).reverse()
  return (
    <section className="movelog">
      <h2>최근 이동 기록</h2>
      {recent.length === 0 ? (
        <p className="empty">아직 이동 기록이 없습니다.</p>
      ) : (
        <ul>
          {recent.map((m) => (
            <li key={m.id}>
              <time>{formatClock(m.at)}</time>{' '}
              <strong>{patients.find((p) => p.id === m.patientId)?.name ?? '(삭제된 카드)'}</strong>{' '}
              {roomName(m.fromRoomId)} → {roomName(m.toRoomId)}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
