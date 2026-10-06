import type { Patient, Room } from '../types'
import { STATUS_LABEL } from '../types'
import { elapsedMinutes, formatClock } from '../lib/time'
import { isAlert } from './FloorPlan'

interface Props {
  patients: Patient[]
  rooms: Room[]
  now: number
  alertMin: number
}

function Row({ p, roomName, now, alertMin }: { p: Patient; roomName: string; now: number; alertMin: number }) {
  const alert = isAlert(p, now, alertMin)
  return (
    <li className={`prow prow-${p.status}${alert ? ' prow-alert' : ''}`}>
      <div className="prow-top">
        <span className="prow-name">{p.name}</span>
        <span className="prow-status">{STATUS_LABEL[p.status]}</span>
      </div>
      <div className="prow-sub">
        {p.birthDate} · {p.procedure}
        {p.staff ? ` / ${p.staff}` : ''}
      </div>
      <div className="prow-time">
        <b className={alert ? 'alert' : ''}>{elapsedMinutes(p.enteredRoomAt, now)}분</b>{' '}
        <small>
          {roomName} · 입실 {formatClock(p.enteredRoomAt)}
        </small>
      </div>
    </li>
  )
}

// 원장용 보기: 평면도 대신 목록. 준비 완료 환자를 맨 위에, 그다음 방별로 보여 준다.
export function DoctorView({ patients, rooms, now, alertMin }: Props) {
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? ''
  const active = patients.filter((p) => p.status !== 'left')
  const byEntry = (a: Patient, b: Patient) => a.enteredRoomAt - b.enteredRoomAt
  const ready = active.filter((p) => p.status === 'ready').sort(byEntry)
  const rest = active.filter((p) => p.status !== 'ready')
  const groups = rooms
    .filter((r) => !r.decor)
    .map((r) => ({ room: r, list: rest.filter((p) => p.roomId === r.id).sort(byEntry) }))
    .filter((g) => g.list.length > 0)
  const count = (st: Patient['status']) => active.filter((p) => p.status === st).length

  return (
    <div className="doctor">
      <div className="summary">
        <span className="chip chip-ready">준비 완료 {count('ready')}</span>
        <span className="chip">대기 {count('waiting')}</span>
        <span className="chip chip-in_progress">진행 중 {count('in_progress')}</span>
      </div>

      {active.length === 0 && <p className="empty-all">현재 보드에 환자가 없습니다.</p>}

      {ready.length > 0 && (
        <section className="dgroup dgroup-ready">
          <h2>준비 완료 · 원장 대기</h2>
          <ul>
            {ready.map((p) => (
              <Row key={p.id} p={p} roomName={roomName(p.roomId)} now={now} alertMin={alertMin} />
            ))}
          </ul>
        </section>
      )}

      {groups.map((g) => (
        <section key={g.room.id} className="dgroup">
          <h2>
            {g.room.name} ({g.list.length})
          </h2>
          <ul>
            {g.list.map((p) => (
              <Row key={p.id} p={p} roomName={g.room.name} now={now} alertMin={alertMin} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
