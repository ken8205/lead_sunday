import { useEffect, useState } from 'react'
import { defaultRooms } from './data/defaultRooms'
import { FloorPlan } from './components/FloorPlan'
import { AddPatientDialog } from './components/AddPatientDialog'
import { MoveLog } from './components/MoveLog'
import { ReadyList } from './components/ReadyList'
import { useBoard } from './store/useBoard'
import { useNow } from './hooks/useNow'
import { STATUS_LABEL } from './types'
import type { Patient, PatientStatus } from './types'

const rooms = defaultRooms
const DESK_ID = 'desk'
const STATUSES: PatientStatus[] = ['waiting', 'ready', 'in_progress', 'left']
const ALERT_KEY = 'patient-board:alertMin'

// 브라우저 확인창 대신 쓰는 두 번 누르기 버튼 (3초 안에 한 번 더 누르면 실행)
function ConfirmButton({ label, confirmLabel, className = '', onConfirm }: { label: string; confirmLabel: string; className?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      className={`btn ${className}${armed ? ' btn-armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}

function loadAlertMin(): number {
  try {
    const v = Number(localStorage.getItem(ALERT_KEY))
    if (v >= 1) return v
  } catch {
    // 저장소 접근 불가 시 기본값
  }
  return 10 // 대기 강조 기준 (분). 5단계 설정 화면으로 이동 예정
}

// 화면 확인용 가상 환자 (실제 환자 아님)
function samplePatients(): Patient[] {
  const now = Date.now()
  const mk = (i: number, name: string, birthDate: string, procedure: string, staff: string, roomId: string, status: PatientStatus, mins: number): Patient => ({
    id: `sample-${i}`,
    name,
    birthDate,
    procedure,
    staff,
    roomId,
    status,
    enteredRoomAt: now - mins * 60000,
    createdAt: now - mins * 60000,
  })
  return [
    mk(1, '홍길동', '1968-03-14', '안면거상', '유빈', 'treat', 'ready', 8),
    mk(2, '김가나', '1975-11-02', '상안검', '도은', 'wait', 'waiting', 3),
    mk(3, '이다라', '1982-07-21', '하안검', '정실장', 'or', 'in_progress', 25),
    mk(4, '박마바', '1990-01-30', '실리프팅', '유빈', 'wait', 'waiting', 12),
    mk(5, '정사아', '1979-05-09', '미니거상', '도은', 'consult1', 'ready', 14),
    mk(6, '오자차', '1985-12-25', '눈밑지방재배치', '유빈', 'desk', 'left', 40),
  ]
}

export default function App() {
  const { patients, archive, moves, addPatient, movePatient, setStatus, removePatient, replaceAll } = useBoard()
  const now = useNow(15000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [alertMin, setAlertMin] = useState(loadAlertMin)

  const selected = patients.find((p) => p.id === selectedId)

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>페이스플러스 환자 동선 보드</h1>
          <p className="note">3단계: 상태·대기 시간 · 이 기기의 브라우저에만 저장됩니다</p>
        </div>
        <div className="toolbar">
          <label className="alert-setting">
            대기 강조 기준
            <input
              type="number"
              min={1}
              max={240}
              value={alertMin}
              onChange={(e) => {
                const v = Math.max(1, Number(e.target.value) || 1)
                setAlertMin(v)
                try {
                  localStorage.setItem(ALERT_KEY, String(v))
                } catch {
                  // 무시
                }
              }}
            />
            분
          </label>
          <button className="btn btn-primary" onClick={() => setAdding(true)}>
            + 환자 추가
          </button>
          <button className="btn" onClick={() => replaceAll(samplePatients())}>
            예시 채우기
          </button>
          <ConfirmButton
            label="모두 비우기"
            confirmLabel="정말 비우기"
            onConfirm={() => {
              replaceAll([])
              setSelectedId(null)
            }}
          />
        </div>
      </header>

      <div className={`hint${selected ? ' hint-active' : ''}`}>
        {selected ? (
          <>
            <span>
              <strong>{selected.name}</strong> 선택됨 — 방을 누르면 이동, 아래 버튼으로 상태 변경
            </span>
            {STATUSES.map((st) => (
              <button
                key={st}
                className={`btn${selected.status === st ? ' btn-active' : ''}`}
                onClick={() => {
                  setStatus(selected.id, st)
                  setSelectedId(null)
                }}
              >
                {STATUS_LABEL[st]}
              </button>
            ))}
            <ConfirmButton
              label="카드 삭제"
              confirmLabel="정말 삭제 (기록도 삭제)"
              className="btn-danger"
              onConfirm={() => {
                removePatient(selected.id)
                setSelectedId(null)
              }}
            />
            <button className="btn" onClick={() => setSelectedId(null)}>
              선택 취소
            </button>
          </>
        ) : (
          <span>카드를 누른 뒤 방을 누르거나, 카드를 끌어서 방에 놓으세요.</span>
        )}
      </div>

      <div className="layout">
        <FloorPlan
          rooms={rooms}
          patients={patients}
          now={now}
          alertMin={alertMin}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={movePatient}
        />
        <ReadyList patients={patients} rooms={rooms} now={now} selectedId={selectedId} onSelect={setSelectedId} />
      </div>

      <MoveLog moves={moves} patients={[...patients, ...archive]} rooms={rooms} />

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
