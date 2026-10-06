// 병원 내부 전용 보드. 환자 식별정보(이름, 생년월일, 수술명)는 정확히 표시해야 하므로 원문 그대로 저장한다.
export type PatientStatus = 'waiting' | 'ready' | 'in_progress' | 'left'

export interface Room {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  order: number
}

export interface Patient {
  id: string
  name: string // 환자 이름 (실명)
  birthDate: string // YYYY-MM-DD
  procedure: string // 수술/시술명
  staff: string // 담당자
  roomId: string
  status: PatientStatus
  enteredRoomAt: number // 현재 방 입실 시각 (ms)
  createdAt: number
}

export const STATUS_LABEL: Record<PatientStatus, string> = {
  waiting: '대기',
  ready: '준비 완료',
  in_progress: '진행 중',
  left: '귀가',
}
