import type { Patient, Room } from '../types'
import { ConfirmButton } from './ConfirmButton'

interface Props {
  rooms: Room[]
  setRooms: (rooms: Room[]) => void
  patients: Patient[]
  alertMin: number
  setAlertMin: (v: number) => void
  dischargeMin: number
  setDischargeMin: (v: number) => void
  leftMin: number
  setLeftMin: (v: number) => void
}

const TONES: { value: NonNullable<Room['tone']>; label: string }[] = [
  { value: 'clinic', label: '진료' },
  { value: 'front', label: '접수·대기' },
  { value: 'support', label: '지원' },
]

export function SettingsPage({ rooms, setRooms, patients, alertMin, setAlertMin, dischargeMin, setDischargeMin, leftMin, setLeftMin }: Props) {
  const update = (id: string, patch: Partial<Room>) => setRooms(rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  const num = (v: string, min: number) => Math.max(min, Math.round(Number(v) || 0))

  const addRoom = () => {
    const bottom = Math.max(...rooms.map((r) => r.y + r.h))
    setRooms([
      ...rooms,
      { id: `room-${Date.now()}`, name: '새 방', x: 160, y: bottom + 10, w: 340, h: 140, order: rooms.length, tone: 'clinic' },
    ])
  }

  return (
    <div className="settings">
      <section className="panel">
        <h2>대기 경고 기준</h2>
        <label className="alert-setting">
          대기·호출 대기가
          <input type="number" min={1} max={240} value={alertMin} onChange={(e) => setAlertMin(Math.max(1, Number(e.target.value) || 1))} />
          분 이상이면 빨간 테두리
        </label>
        <p className="help">
          그 뒤 5분이 더 지나면(지금 기준 {alertMin + 5}분) 깜박이고, 10분이 더 지나면(지금 기준 {alertMin + 10}분) 더 빠르게 깜박입니다.
        </p>
        <label className="alert-setting">
          퇴원대기가
          <input type="number" min={1} max={480} value={dischargeMin} onChange={(e) => setDischargeMin(Math.max(1, Number(e.target.value) || 1))} />
          분 이상이면 초록색으로 깜박
        </label>
      </section>

      <section className="panel">
        <h2>귀가 카드 정리</h2>
        <label className="alert-setting">
          귀가 처리 후
          <input type="number" min={1} max={240} value={leftMin} onChange={(e) => setLeftMin(Math.max(1, Number(e.target.value) || 1))} />
          분이 지나면 보드에서 내리고 &quot;귀가&quot; 목록으로 옮김
        </label>
        <p className="help">기록은 지워지지 않습니다. 오늘 귀가한 환자는 보드 오른쪽(폰은 원장 보기 아래)의 &quot;귀가&quot; 목록에서 볼 수 있습니다.</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>방 ({rooms.length})</h2>
          <button className="btn btn-primary" onClick={addRoom}>
            + 방 추가
          </button>
        </div>
        <p className="help">방 이름과 종류를 바꾸고, 방을 추가하거나 삭제할 수 있습니다. 새 방은 평면도 맨 아래에 생기며, 위치는 &quot;위치·크기&quot;에서 숫자로 조정합니다.</p>
        <ul className="roomlist">
          {rooms.map((r) => {
            const count = patients.filter((p) => p.roomId === r.id).length
            return (
              <li key={r.id}>
                <div className="roomrow">
                  <input aria-label="방 이름" value={r.name} onChange={(e) => update(r.id, { name: e.target.value })} />
                  <select aria-label="방 종류" value={r.tone ?? 'clinic'} onChange={(e) => update(r.id, { tone: e.target.value as Room['tone'] })}>
                    {TONES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <label className="check">
                    <input type="checkbox" checked={!r.decor} onChange={(e) => update(r.id, { decor: !e.target.checked })} />
                    카드 놓기
                  </label>
                  {count > 0 ? (
                    <span className="help">카드 {count}장 있음</span>
                  ) : (
                    <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-danger" onConfirm={() => setRooms(rooms.filter((x) => x.id !== r.id))} />
                  )}
                </div>
                <details>
                  <summary>위치·크기</summary>
                  <div className="geo">
                    {(['x', 'y', 'w', 'h'] as const).map((k) => (
                      <label key={k}>
                        {{ x: '가로 위치', y: '세로 위치', w: '너비', h: '높이' }[k]}
                        <input type="number" step={10} min={k === 'w' || k === 'h' ? 60 : 0} value={r[k]} onChange={(e) => update(r.id, { [k]: num(e.target.value, k === 'w' || k === 'h' ? 60 : 0) })} />
                      </label>
                    ))}
                  </div>
                </details>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
