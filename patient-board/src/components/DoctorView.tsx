import type { Patient, Room, WaitFor } from '../types'
import { WAIT_FOR_LABEL, metaLine, statusLabel } from '../types'
import { elapsedMinutes, formatClock, formatTotal } from '../lib/time'
import { sortQueue } from '../lib/queue'
import { isAlert } from './FloorPlan'

interface Props {
  patients: Patient[]
  rooms: Room[]
  now: number
  alertMin: number
  order: string[]
}

function Row({ p, roomName, now, alertMin }: { p: Patient; roomName: string; now: number; alertMin: number }) {
  const alert = isAlert(p, now, alertMin)
  return (
    <li className={`prow prow-${p.status}${alert ? ' prow-alert' : ''}`}>
      <div className="prow-top">
        <span className="prow-name">{p.name}</span>
        <span className="prow-status">{statusLabel(p)}</span>
      </div>
      <div className="prow-sub">
        {[metaLine(p), p.procedure].filter(Boolean).join(' · ')}
        {p.staff ? ` / ${p.staff}` : ''}
      </div>
      <div className="prow-time">
        <b className={alert ? 'alert' : ''}>{elapsedMinutes(p.enteredRoomAt, now)}분</b>{' '}
        <small>
          {roomName} · 입실 {formatClock(p.enteredRoomAt)} · 총 {formatTotal(p.createdAt, now)}
        </small>
      </div>
    </li>
  )
}

const isDoctorReady = (p: Patient) => p.status === 'ready' && (p.waitFor ?? 'doctor') === 'doctor'

// 원장용 보기: 평면도 대신 목록. 원장 대기 환자를 맨 위에, 그다음 방별로 보여 준다.
// 실장·간호사 대기 환자는 방별 목록에 상태 이름과 함께 나온다.
export function DoctorView({ patients, rooms, now, alertMin, order }: Props) {
  const roomName = (id: string) => rooms.find((r) => r.id === id)?.name ?? ''
  const active = patients.filter((p) => p.status !== 'left')
  const byEntry = (a: Patient, b: Patient) => a.enteredRoomAt - b.enteredRoomAt
  const doctorReady = sortQueue(active.filter(isDoctorReady), order)
  const rest = active.filter((p) => !isDoctorReady(p))
  const groups = rooms
    .filter((r) => !r.decor)
    .map((r) => ({ room: r, list: rest.filter((p) => p.roomId === r.id).sort(byEntry) }))
    .filter((g) => g.list.length > 0)
  const countWait = (t: WaitFor) => active.filter((p) => p.status === 'ready' && p.waitFor === t).length

  return (
    <div className="doctor">
      <div className="summary">
        <span className="chip chip-ready">원장 대기 {doctorReady.length}</span>
        {(['manager', 'nurse', 'coordinator'] as WaitFor[]).map(
          (t) =>
            countWait(t) > 0 && (
              <span key={t} className="chip chip-ready">
                {WAIT_FOR_LABEL[t]} 대기 {countWait(t)}
              </span>
            ),
        )}
        <span className="chip">대기 {active.filter((p) => p.status === 'waiting').length}</span>
        <span className="chip chip-in_progress">진행 중 {active.filter((p) => p.status === 'in_progress').length}</span>
      </div>

      {active.length === 0 && <p className="empty-all">현재 보드에 환자가 없습니다.</p>}

      {doctorReady.length > 0 && (
        <section className="dgroup dgroup-ready">
          <h2>원장 대기</h2>
          <ul>
            {doctorReady.map((p) => (
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
