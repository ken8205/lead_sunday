import { useState } from 'react'
import type { Patient, Room } from '../types'
import { formatClock } from '../lib/time'

interface Props {
  patients: Patient[] // 귀가 후 일정 시간이 지나 평면도에서 내려간 카드
  rooms: Room[]
  onRestore?: (id: string) => void // 잘못 눌렀을 때 보드로 되돌리기 (보드 화면에서만)
}

// 귀가 목록: 평소에는 접어 두고, 누르면 펼쳐 본다.
export function LeftList({ patients, rooms, onRestore }: Props) {
  const [open, setOpen] = useState(false)
  const list = [...patients].sort((a, b) => (b.statusAt ?? 0) - (a.statusAt ?? 0))
  return (
    <section className="leftlist">
      <button className="leftlist-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>귀가 ({list.length})</span>
        <span className="leftlist-toggle">{open ? '접기 ▲' : '펼치기 ▼'}</span>
      </button>
      {open &&
        (list.length === 0 ? (
          <p className="empty">오늘 귀가 목록이 비어 있습니다.</p>
        ) : (
          <ul>
            {list.map((p) => (
              <li key={p.id}>
                <span className="leftlist-name" title={`${rooms.find((r) => r.id === p.roomId)?.name ?? ''} · ${p.procedure}`}>
                  {p.name}
                </span>
                <span className="leftlist-time">{formatClock(p.statusAt ?? p.enteredRoomAt)}</span>
                {onRestore && (
                  <button className="leftlist-undo" onClick={() => onRestore(p.id)} aria-label={`${p.name} 보드로 되돌리기`}>
                    되돌리기
                  </button>
                )}
              </li>
            ))}
          </ul>
        ))}
    </section>
  )
}
