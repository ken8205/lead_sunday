import { useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import type { Patient, Room, WaitFor } from '../types'
import { WAIT_FOR_LABEL } from '../types'
import { elapsedMinutes } from '../lib/time'
import { sortQueue } from '../lib/queue'

interface Props {
  patients: Patient[]
  rooms: Room[]
  now: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  order: string[]
  onReorder: (order: string[]) => void
}

const TARGETS: WaitFor[] = ['doctor', 'manager', 'nurse', 'coordinator']

interface DragState {
  target: WaitFor
  id: string
  overIndex: number
}

export function ReadyList({ patients, rooms, now, selectedId, onSelect, order, onReorder }: Props) {
  const ready = patients.filter((p) => p.status === 'ready')
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({})
  const [drag, setDrag] = useState<DragState | null>(null)
  const manual = ready.some((p) => order.includes(p.id))

  const overIndexFor = (list: Patient[], clientY: number) => {
    for (let i = 0; i < list.length; i++) {
      const r = itemRefs.current[list[i].id]?.getBoundingClientRect()
      if (r && clientY < r.top + r.height / 2) return i
    }
    return list.length
  }

  const onGripDown = (e: PointerEvent, target: WaitFor, id: string, list: Patient[]) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ target, id, overIndex: list.findIndex((p) => p.id === id) })
  }
  const onGripMove = (e: PointerEvent, list: Patient[]) => {
    if (!drag) return
    setDrag({ ...drag, overIndex: overIndexFor(list, e.clientY) })
  }
  const onGripUp = (list: Patient[]) => {
    if (!drag) return
    const ids = list.map((p) => p.id).filter((id) => id !== drag.id)
    const from = list.findIndex((p) => p.id === drag.id)
    const at = drag.overIndex > from ? drag.overIndex - 1 : drag.overIndex
    ids.splice(at, 0, drag.id)
    // 이 구역의 순서를 손으로 정한 순서로 기록한다.
    onReorder([...order.filter((id) => !ids.includes(id)), ...ids])
    setDrag(null)
  }

  return (
    <aside className="readylist">
      <div className="readylist-head">
        <h2>호출 대기 ({ready.length})</h2>
        {manual && (
          <button className="btn btn-small" onClick={() => onReorder(order.filter((id) => !ready.some((p) => p.id === id)))}>
            시간순으로
          </button>
        )}
      </div>
      <p className="readylist-help">{manual ? '손으로 정한 순서입니다.' : '오래 기다린 순입니다. ⠿를 끌어 순서를 바꿀 수 있어요.'}</p>
      {ready.length === 0 && <p className="empty">호출 대기 중인 환자가 없습니다.</p>}
      {TARGETS.map((t) => {
        const list = sortQueue(
          ready.filter((p) => (p.waitFor ?? 'doctor') === t),
          order,
        )
        if (list.length === 0) return null
        return (
          <section key={t} className="rl-section">
            <h3>
              {WAIT_FOR_LABEL[t]} 대기 ({list.length})
            </h3>
            <ul>
              {list.map((p, i) => {
                const dragging = drag?.id === p.id
                const before = drag?.target === t && drag.overIndex === i && !dragging
                return (
                  <li
                    key={p.id}
                    ref={(el) => {
                      itemRefs.current[p.id] = el
                    }}
                    className={`${before ? 'drop-before' : ''}${dragging ? ' dragging' : ''}`}
                  >
                    <span
                      className="grip"
                      aria-label="순서 바꾸기"
                      onPointerDown={(e) => onGripDown(e, t, p.id, list)}
                      onPointerMove={(e) => drag?.target === t && onGripMove(e, list)}
                      onPointerUp={() => drag?.target === t && onGripUp(list)}
                      onPointerCancel={() => setDrag(null)}
                    >
                      ⠿
                    </span>
                    <button className={selectedId === p.id ? 'selected' : ''} onClick={() => onSelect(selectedId === p.id ? null : p.id)}>
                      <strong>{p.name}</strong>
                      <span className="mins">{elapsedMinutes(p.enteredRoomAt, now)}분</span>
                      <span className="sub">
                        {rooms.find((r) => r.id === p.roomId)?.name} · {p.procedure}
                      </span>
                    </button>
                  </li>
                )
              })}
              {drag?.target === t && drag.overIndex === list.length && <li className="drop-end" />}
            </ul>
          </section>
        )
      })}
    </aside>
  )
}
