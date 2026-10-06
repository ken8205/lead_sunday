import type { Patient, Room } from '../types'
import { elapsedMinutes } from '../lib/time'

interface Props {
  patients: Patient[]
  rooms: Room[]
  now: number
  selectedId: string | null
  onSelect: (id: string | null) => void
}

export function ReadyList({ patients, rooms, now, selectedId, onSelect }: Props) {
  const ready = patients.filter((p) => p.status === 'ready').sort((a, b) => a.enteredRoomAt - b.enteredRoomAt)
  return (
    <aside className="readylist">
      <h2>준비 완료 · 원장 대기 ({ready.length})</h2>
      {ready.length === 0 ? (
        <p className="empty">대기 중인 환자가 없습니다.</p>
      ) : (
        <ul>
          {ready.map((p) => (
            <li key={p.id}>
              <button className={selectedId === p.id ? 'selected' : ''} onClick={() => onSelect(selectedId === p.id ? null : p.id)}>
                <strong>{p.name}</strong>
                <span className="mins">{elapsedMinutes(p.enteredRoomAt, now)}분</span>
                <span className="sub">
                  {rooms.find((r) => r.id === p.roomId)?.name} · {p.procedure}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
