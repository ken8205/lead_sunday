import { useEffect, useMemo, useState } from 'react'
import { FloorPlan } from './components/FloorPlan'
import { AddPatientDialog } from './components/AddPatientDialog'
import { MoveLog } from './components/MoveLog'
import { ReadyList } from './components/ReadyList'
import { DoctorView } from './components/DoctorView'
import { SettingsPage } from './components/SettingsPage'
import { ConfirmButton } from './components/ConfirmButton'
import { useBoardStore, useRoomsStore } from './store'
import { LoginPage } from './components/LoginPage'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { useAuth } from './hooks/useAuth'
import type { StaffUser } from './hooks/useAuth'
import { useStaffList } from './hooks/useStaffList'
import { isCloud } from './lib/supabase'
import { ROLE_LABEL } from './types'
import { useNow } from './hooks/useNow'
import { withStatusAt } from './lib/statusAt'
import type { Category, Patient, PatientStatus, WaitFor } from './types'

type View = 'board' | 'doctor' | 'settings'

const STATUS_OPTIONS: { label: string; status: PatientStatus; waitFor?: WaitFor }[] = [
  { label: '대기', status: 'waiting' },
  { label: '원장 대기', status: 'ready', waitFor: 'doctor' },
  { label: '실장 대기', status: 'ready', waitFor: 'manager' },
  { label: '간호사 대기', status: 'ready', waitFor: 'nurse' },
  { label: '코디 대기', status: 'ready', waitFor: 'coordinator' },
  { label: '퇴원대기', status: 'discharge' },
  { label: '진행 중', status: 'in_progress' },
  { label: '귀가', status: 'left' },
]
const ALERT_KEY = 'patient-board:alertMin'
const DISCHARGE_KEY = 'patient-board:dischargeMin'

function loadNumber(key: string, fallback: number): number {
  try {
    const v = Number(localStorage.getItem(key))
    if (v >= 1) return v
  } catch {
    // 저장소 접근 불가 시 기본값
  }
  return fallback
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
    createdAt: now - (mins + 15 + i * 5) * 60000, // 방에 들어오기 전 대기 시간이 있었던 것처럼
  })
  return [
    mk(1, '홍길동', '1968-03-14', 'treatment', '안면거상 시술', '유빈', 'treat', 'ready', 8, 'doctor'),
    mk(2, '김가나', '1975-11-02', 'consult', '상안검', '도은', 'wait', 'waiting', 3),
    mk(3, '이다라', '1982-07-21', 'surgery', '하안검', '정실장', 'or', 'in_progress', 25),
    mk(4, '박마바', '1990-01-30', 'treatment', '실리프팅', '유빈', 'wait', 'waiting', 11),
    mk(5, '정사아', '1979-05-09', 'consult', '미니거상', '도은', 'consult1', 'ready', 16, 'manager'),
    mk(6, '오자차', '1985-12-25', 'followup', '눈밑지방재배치', '유빈', 'desk', 'left', 40),
    mk(7, '최카타', '1972-08-17', 'followup', '안면거상 경과', '도은', 'recov2', 'ready', 6, 'nurse'),
    mk(8, '강파하', '1988-02-03', 'treatment', '스킨부스터', '유빈', 'treat', 'ready', 22, 'doctor'),
    mk(9, '송타퓨', '1993-09-09', 'consult', '코 성형 상담', '도은', 'consult2', 'ready', 4, 'coordinator'),
    mk(11, '조차카', '1969-06-30', 'surgery', '안면거상', '정실장', 'recov1', 'discharge', 35),
    mk(12, '배타파', '1983-10-12', 'treatment', '실리프팅', '유빈', 'recov1', 'discharge', 12),
    mk(10, '김업체', '', 'meeting', '장비 도입 미팅', '정실장', 'consult1', 'in_progress', 15),
  ]
}

interface BoardProps {
  user?: StaffUser // 서버 모드에서 로그인한 직원
  onSignOut?: () => void
  onChangePassword?: (current: string, next: string) => Promise<string | null>
}

function Board({ user, onSignOut, onChangePassword }: BoardProps) {
  const { patients, archive, moves, order, setOrder, addPatient, movePatient, setStatus, removePatient, replaceAll, ready: boardReady, error } = useBoardStore()
  const { rooms, setRooms, ready: roomsReady } = useRoomsStore()
  const staffList = useStaffList(isCloud)
  const staffName = (id?: string) => (id ? (staffList.find((x) => x.id === id)?.name ?? '') : '')
  const staffSuggestions = isCloud ? staffList.filter((x) => x.active).map((x) => x.name) : undefined
  const now = useNow(15000)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [alertMin, setAlertMinState] = useState(() => loadNumber(ALERT_KEY, 10)) // 대기 강조 기준(분)
  const [dischargeMin, setDischargeMinState] = useState(() => loadNumber(DISCHARGE_KEY, 30)) // 퇴원대기 강조 기준(분)
  // 폰처럼 좁은 화면에서는 원장 보기로 시작한다.
  const [view, setView] = useState<View>(() => (window.matchMedia('(max-width: 700px)').matches ? 'doctor' : 'board'))

  const saveNumber = (key: string, v: number) => {
    try {
      localStorage.setItem(key, String(v))
    } catch {
      // 무시
    }
  }
  const setAlertMin = (v: number) => {
    setAlertMinState(v)
    saveNumber(ALERT_KEY, v)
  }
  const setDischargeMin = (v: number) => {
    setDischargeMinState(v)
    saveNumber(DISCHARGE_KEY, v)
  }
  const alert = { redMin: alertMin, dischargeMin }
  // 화면에 보여 줄 환자: 현재 상태가 된 시각(statusAt)을 이동 기록에서 계산해 붙인다.
  const shown = useMemo(() => withStatusAt(patients, moves), [patients, moves])

  const selected = patients.find((p) => p.id === selectedId)
  // 새 카드는 데스크에서 시작한다. 데스크가 없으면 카드를 놓을 수 있는 첫 번째 방.
  const defaultRoomId = (rooms.find((r) => r.id === 'desk' && !r.decor) ?? rooms.find((r) => !r.decor))?.id ?? rooms[0].id

  // 삭제되거나 없어진 방에 있던 카드는 기본 방으로 옮겨 화면에서 사라지지 않게 한다.
  useEffect(() => {
    if (!boardReady || !roomsReady) return // 서버에서 방과 카드를 모두 불러오기 전에는 건드리지 않는다
    const ids = new Set(rooms.map((r) => r.id))
    patients.filter((p) => !ids.has(p.roomId)).forEach((p) => movePatient(p.id, defaultRoomId))
  }, [rooms, patients, defaultRoomId, movePatient, boardReady, roomsReady])
  const isActive = (o: (typeof STATUS_OPTIONS)[number]) =>
    !!selected && selected.status === o.status && (o.status !== 'ready' || (selected.waitFor ?? 'doctor') === o.waitFor)

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>페이스플러스 환자 동선 보드</h1>
          <p className="note">{user ? `${user.name}${user.name === ROLE_LABEL[user.role] ? '' : ` ${ROLE_LABEL[user.role]}`} 로그인 중 · 모든 기기에 실시간 공유됩니다` : '이 기기의 브라우저에만 저장됩니다'}</p>
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
        {onSignOut && (
          <div className="toolbar">
            {onChangePassword && (
              <button className="btn" onClick={() => setChangingPw(true)}>
                비밀번호 변경
              </button>
            )}
            <button className="btn" onClick={onSignOut}>
              로그아웃
            </button>
          </div>
        )}
        {view === 'board' && (
          <div className="toolbar">
            <button className="btn btn-primary" onClick={() => setAdding(true)}>
              + 환자 추가
            </button>
            {replaceAll && (
              <>
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
              </>
            )}
          </div>
        )}
      </header>

      {error && <div className="banner-error">{error}</div>}
      {(!boardReady || !roomsReady) && <p className="empty-all">서버에서 불러오는 중…</p>}

      {boardReady && roomsReady && view === 'doctor' && <DoctorView patients={shown} rooms={rooms} now={now} alert={alert} order={order} />}

      {boardReady && roomsReady && view === 'settings' && <SettingsPage rooms={rooms} setRooms={setRooms} patients={patients} alertMin={alertMin} setAlertMin={setAlertMin} dischargeMin={dischargeMin} setDischargeMin={setDischargeMin} />}

      {boardReady && roomsReady && view === 'board' && (
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
            <FloorPlan rooms={rooms} patients={shown} now={now} alert={alert} selectedId={selectedId} onSelect={setSelectedId} onMove={movePatient} />
            <ReadyList patients={patients} rooms={rooms} now={now} selectedId={selectedId} onSelect={setSelectedId} order={order} onReorder={setOrder} />
          </div>

          <MoveLog moves={moves} patients={[...patients, ...archive]} rooms={rooms} staffName={staffName} />
        </>
      )}

      {changingPw && onChangePassword && <ChangePasswordDialog onChange={onChangePassword} onClose={() => setChangingPw(false)} />}

      {adding && (
        <AddPatientDialog
          rooms={rooms}
          defaultRoomId={defaultRoomId}
          staffSuggestions={staffSuggestions}
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

function CloudGate() {
  const { state, signIn, signOut, changePassword } = useAuth()
  if (state.status === 'loading') return <p className="empty-all">불러오는 중…</p>
  if (state.status === 'out') return <LoginPage onSignIn={signIn} />
  if (state.status === 'denied')
    return (
      <div className="login">
        <div className="login-card">
          <h1>접근 권한이 없습니다</h1>
          <p className="note">{state.email} 계정은 보드를 볼 수 없습니다. 원장님께 문의하세요.</p>
          <button className="btn" onClick={signOut}>
            로그아웃
          </button>
        </div>
      </div>
    )
  return <Board user={state.user} onSignOut={signOut} onChangePassword={changePassword} />
}

export default function App() {
  return isCloud ? <CloudGate /> : <Board />
}
