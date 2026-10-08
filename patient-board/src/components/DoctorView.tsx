import type { Patient, Room, WaitFor } from '../types'
import { WAIT_FOR_LABEL, metaLine, statusLabel } from '../types'
import { elapsedMinutes, formatClock, formatTotal } from '../lib/time'
import { sortQueue } from '../lib/queue'
import { alertLevel, sinceOf } from '../lib/alert'
import { LeftList } from './LeftList'
import type { AlertConfig } from '../lib/alert'

interface Props {
  patients: Patient[]
  rooms: Room[]
  now: number
  alert: AlertConfig
  order: string[]
  leftList: Patient[] // 귀가 후 일정 시간이 지난 카드
}

const ROW_CLASS = { none: '', red: ' prow-alert', blink: ' prow-alert prow-blink', fast: ' prow-alert prow-blink-fast', green: ' prow-green-alert' } as const

function Row({ p, roomName, now, alert }: { p: Patient; roomName: string; now: number; alert: AlertConfig }) {
  const level = alertLevel(p, now, alert)
  const red = level === 'red' || level === 'blink' || level === 'fast'
  const since = sinceOf(p)
  return (
    <li className={`prow prow-${p.status}${ROW_CLASS[level]}`}>
      <div className="prow-top">
        <span className="prow-name">{p.name}</span>
        <span className="prow-status">{statusLabel(p)}</span>
      </div>
      <div className="prow-sub">
        {[metaLine(p), p.procedure].filter(Boolean).join(' · ')}
        {p.staff ? ` / ${p.staff}` : ''}
      </div>
      <div className="prow-time">
        <b className={red ? 'alert' : ''}>{elapsedMinutes(since, now)}분</b>{' '}
        <small>
          {roomName} · {p.status === 'discharge' || p.status === 'ready' ? `${formatClock(since)}부터` : `입실 ${formatClock(p.enteredRoomAt)}`} · 총 {formatTotal(p.createdAt, now)}
        </small>
      </div>
    </li>
  )
}

const isDoctorReady = (p: Patient) => p.status === 'ready' && (p.waitFor ?? 'doctor') === 'doctor'

// 원장용 보기: 평면도 대신 목록. 원장 대기 환자를 맨 위에, 그다음 방별로 보여 준다.
// 실장·간호사 대기 환자는 방별 목록에 상태 이름과 함께 나온다.
export function DoctorView({ patients, rooms, now, alert, order, leftList }: Props) {
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
        {active.some((p) => p.status === 'discharge') && (
          <span className="chip chip-discharge">퇴원대기 {active.filter((p) => p.status === 'discharge').length}</span>
        )}
        <span className="chip chip-in_progress">진행 중 {active.filter((p) => p.status === 'in_progress').length}</span>
      </div>

      {active.length === 0 && <p className="empty-all">현재 보드에 환자가 없습니다.</p>}

      {doctorReady.length > 0 && (
        <section className="dgroup dgroup-ready">
          <h2>원장 대기</h2>
          <ul>
            {doctorReady.map((p) => (
              <Row key={p.id} p={p} roomName={roomName(p.roomId)} now={now} alert={alert} />
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
              <Row key={p.id} p={p} roomName={g.room.name} now={now} alert={alert} />
            ))}
          </ul>
        </section>
      ))}

      {leftList.length > 0 && <LeftList patients={leftList} rooms={rooms} />}
    </div>
  )
}
