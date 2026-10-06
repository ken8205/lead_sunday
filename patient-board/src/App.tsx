import { useState } from 'react'
import { FloorPlan } from './components/FloorPlan'
import { AddPatientDialog } from './components/AddPatientDialog'
import { MoveLog } from './components/MoveLog'
import { ReadyList } from './components/ReadyList'
import { DoctorView } from './components/DoctorView'
import { SettingsPage } from './components/SettingsPage'
import { ConfirmButton } from './components/ConfirmButton'
import { useBoard } from './store/useBoard'
import { useRooms } from './store/useRooms'
import { useNow } from './hooks/useNow'
import type { Category, Patient, PatientStatus, WaitFor } from './types'

type View = 'board' | 'doctor' | 'settings'

const STATUS_OPTIONS: { label: string; status: PatientStatus; waitFor?: WaitFor }[] = [
  { label: '대기', status: 'waiting' },
  { label: '원장 대기', status: 'ready', waitFor: 'doctor' },
  { label: '실장 대기', status: 'ready', waitFor: 'manager' },
  { label: '간호사 대기', status: 'ready', waitFor: 'nurse' },
  { label: '진행 중', status: 'in_progress' },
  { label: '귀가', status: 'left' },
]
const ALERT_KEY = 'patient-board:alertMin'

function loadAlertMin(): number {
  try {
    const v = Number(localStorage.getItem(ALERT_KEY))
    if (v >= 1) return v
  } catch {
    // 저장소 접근 불가 시 기본값
  }
  return 10 // 대기 강조 기준 (분)
}

// 화면 확인용 가상 환자 (실제 환자 아님)
function samplePatients(): Patient[] {
  const now = Date.now()
  const mk = (
    i: number,
    name: string,
    birthDate: string,
    category: Category,
    procedure: string,
    staff: string,
    roomId: string,
    status: PatientStatus,
    mins: number,
    waitFor?: WaitFor,
  ): Patient => ({
    id: `sample-${i}`,
    name,
    birthDate,
    category,
    procedure,
    staff,
    roomId,
    status,
    waitFor,
    enteredRoomAt: now - mins * 60000,
    createdAt: now - mins * 60000,
  })
  return [
    mk(1, '홍길동', '1968-03-14', 'treatment', '안면거상 시술', '유빈', 'treat', 'ready', 8, 'doctor'),
    mk(2, '김가나', '1975-11-02', 'consult', '상안검', '도은', 'wait', 'waiting', 3),
    mk(3, '이다라', '1982-07-21', 'surgery', '하안검', '정실장', 'or', 'in_progress', 25),
    mk(4, '박마바', '1990-01-30', 'treatment', '실리프팅', '유빈', 'wait', 'waiting', 12),
    mk(5, '정사아', '1979-05-09', 'consult', '미니거상', '도은', 'consult1', 'ready', 14, 'manager'),
    mk(6, '오자차', '1985-12-25', 'followup', '눈밑지방재배치', '유빈', 'desk', 'left', 40),
    mk(7, '최카타', '1972-08-17', 'followup', '안면거상 경과', '도은', 'recov2', 'ready', 6, 'nurse'),
    mk(8, '강파하', '1988-02-03', 'treatment', '스킨부스터', '유빈', 'treat', 'ready', 11, 'doctor'),
  ]
}

export default function App() {
  const { patients, archive, moves, order, setOrder, addPatient, movePatient, setStatus, removePatient, replaceAll } = useBoard()
  const { rooms, setRooms } = useRooms()
  const now = useNow(15000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [alertMin, setAlertMinState] = useState(loadAlertMin)
  // 폰처럼 좁은 화면에서는 원장 보기로 시작한다.
  const [view, setView] = useState<View>(() => (window.matchMedia('(max-width: 700px)').matches ? 'doctor' : 'board'))

  const setAlertMin = (v: number) => {
    setAlertMinState(v)
    try {
      localStorage.setItem(ALERT_KEY, String(v))
    } catch {
      // 무시
    }
  }

  const selected = patients.find((p) => p.id === selectedId)
  const defaultRoomId = (rooms.find((r) => r.id === 'desk' && !r.decor) ?? rooms.find((r) => !r.decor))?.id ?? rooms[0].id
  const isActive = (o: (typeof STATUS_OPTIONS)[number]) =>
    !!selected && selected.status === o.status && (o.status !== 'ready' || (selected.waitFor ?? 'doctor') === o.waitFor)

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>페이스플러스 환자 동선 보드</h1>
          <p className="note">5단계: 설정 · 이 기기의 브라우저에만 저장됩니다</p>
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              ['board', '보드'],
              ['doctor', '원장 보기'],
              ['settings', '설정'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => setView(v)}>
              {label}
            </button>
          ))}
        </div>
        {view === 'board' && (
          <div className="toolbar">
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
        )}
      </header>

      {view === 'doctor' && <DoctorView patients={patients} rooms={rooms} now={now} alertMin={alertMin} order={order} />}

      {view === 'settings' && <SettingsPage rooms={rooms} setRooms={setRooms} patients={patients} alertMin={alertMin} setAlertMin={setAlertMin} />}

      {view === 'board' && (
        <>
          <div className={`hint${selected ? ' hint-active' : ''}`}>
            {selected ? (
              <>
                <span>
                  <strong>{selected.name}</strong> 선택됨 — 방을 누르면 이동, 아래 버튼으로 상태 변경
                </span>
                {STATUS_OPTIONS.map((o) => (
                  <button
                    key={o.label}
                    className={`btn${isActive(o) ? ' btn-active' : ''}`}
                    onClick={() => {
                      setStatus(selected.id, o.status, o.waitFor)
                      setSelectedId(null)
                    }}
                  >
                    {o.label}
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
            <FloorPlan rooms={rooms} patients={patients} now={now} alertMin={alertMin} selectedId={selectedId} onSelect={setSelectedId} onMove={movePatient} />
            <ReadyList patients={patients} rooms={rooms} now={now} selectedId={selectedId} onSelect={setSelectedId} order={order} onReorder={setOrder} />
          </div>

          <MoveLog moves={moves} patients={[...patients, ...archive]} rooms={rooms} />
        </>
      )}

      {adding && (
        <AddPatientDialog
          rooms={rooms}
          defaultRoomId={defaultRoomId}
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
