import { useState } from 'react'
import { defaultRooms } from './data/defaultRooms'
import { FloorPlan } from './components/FloorPlan'
import { AddPatientDialog } from './components/AddPatientDialog'
import { MoveLog } from './components/MoveLog'
import { useBoard } from './store/useBoard'
import { useNow } from './hooks/useNow'
import type { Patient } from './types'

const rooms = defaultRooms
const DESK_ID = 'desk'

// 화면 확인용 가상 환자 (실제 환자 아님)
function samplePatients(): Patient[] {
  const now = Date.now()
  const mk = (i: number, name: string, birthDate: string, procedure: string, staff: string, roomId: string, mins: number): Patient => ({
    id: `sample-${i}`,
    name,
    birthDate,
    procedure,
    staff,
    roomId,
    status: 'waiting',
    enteredRoomAt: now - mins * 60000,
    createdAt: now - mins * 60000,
  })
  return [
    mk(1, '홍길동', '1968-03-14', '안면거상', '유빈', 'treat', 8),
    mk(2, '김가나', '1975-11-02', '상안검', '도은', 'wait', 3),
    mk(3, '이다라', '1982-07-21', '하안검', '정실장', 'or', 25),
    mk(4, '박마바', '1990-01-30', '실리프팅', '유빈', 'wait', 12),
  ]
}

export default function App() {
  const { patients, moves, addPatient, movePatient, removePatient, replaceAll } = useBoard()
  const now = useNow()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const selected = patients.find((p) => p.id === selectedId)

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>페이스플러스 환자 동선 보드</h1>
          <p className="note">2단계: 카드 추가와 방 이동 · 이 기기의 브라우저에만 저장됩니다</p>
        </div>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + 환자 추가
          </button>
          <button className="btn" onClick={() => replaceAll(samplePatients())}>
            예시 채우기
          </button>
          <button
            className="btn"
            onClick={() => {
              if (confirm('보드의 모든 카드를 지울까요?')) {
                replaceAll([])
                setSelectedId(null)
              }
            }}
          >
            모두 비우기
          </button>
        </div>
      </header>

      <div className={`hint${selected ? ' hint-active' : ''}`}>
        {selected ? (
          <>
            <span>
              <strong>{selected.name}</strong> 선택됨 — 옮길 방을 누르세요
            </span>
            <button
              className="btn btn-danger"
              onClick={() => {
                if (confirm(`${selected.name} 카드를 삭제할까요?`)) {
                  removePatient(selected.id)
                  setSelectedId(null)
                }
              }}
            >
              카드 삭제
            </button>
            <button className="btn" onClick={() => setSelectedId(null)}>
              선택 취소
            </button>
          </>
        ) : (
          <span>카드를 누른 뒤 방을 누르거나, 카드를 끌어서 방에 놓으세요.</span>
        )}
      </div>

      <FloorPlan
        rooms={rooms}
        patients={patients}
        now={now}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onMove={movePatient}
      />

      <MoveLog moves={moves} patients={patients} rooms={rooms} />

      {adding && (
        <AddPatientDialog
          rooms={rooms}
          defaultRoomId={DESK_ID}
          onClose={() => setAdding(false)}
          onSubmit={(p, roomId) => {
            addPatient(p, roomId)
            setAdding(false)
          }}
        />
      )}
    </main>
  )
}
