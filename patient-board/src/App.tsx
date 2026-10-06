import { defaultRooms } from './data/defaultRooms'
import { FloorPlan } from './components/FloorPlan'
import type { Patient } from './types'

// 1단계 확인용 가상 환자 (실제 환자 아님)
const now = Date.now()
const samplePatients: Patient[] = [
  { id: 's1', name: '홍길동', birthDate: '1968-03-14', procedure: '안면거상', staff: '유빈', roomId: 'treat', status: 'ready', enteredRoomAt: now - 8 * 60000, createdAt: now },
  { id: 's2', name: '김가나', birthDate: '1975-11-02', procedure: '상안검', staff: '도은', roomId: 'wait', status: 'waiting', enteredRoomAt: now - 3 * 60000, createdAt: now },
  { id: 's3', name: '이다라', birthDate: '1982-07-21', procedure: '하안검', staff: '정실장', roomId: 'or', status: 'in_progress', enteredRoomAt: now - 25 * 60000, createdAt: now },
  { id: 's4', name: '박마바', birthDate: '1990-01-30', procedure: '실리프팅', staff: '유빈', roomId: 'wait', status: 'waiting', enteredRoomAt: now - 12 * 60000, createdAt: now },
]

export default function App() {
  return (
    <main>
      <h1>페이스플러스 환자 동선 보드</h1>
      <p className="note">1단계: 평면도 확인용 화면 · 카드는 가상 예시입니다</p>
      <FloorPlan rooms={defaultRooms} patients={samplePatients} />
    </main>
  )
}
