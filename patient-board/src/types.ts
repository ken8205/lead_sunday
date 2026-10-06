// 병원 내부 전용 보드. 환자 식별정보(이름, 생년월일, 수술명)는 정확히 표시해야 하므로 원문 그대로 저장한다.
export type PatientStatus = 'waiting' | 'ready' | 'in_progress' | 'left'

// 방문 분류
export type Category = 'consult' | 'surgery' | 'treatment' | 'followup' | 'meeting'
export const CATEGORY_LABEL: Record<Category, string> = {
  consult: '상담',
  surgery: '수술',
  treatment: '치료',
  followup: '경과',
  meeting: '미팅',
}

// '준비 완료'일 때 누구를 기다리는지
export type WaitFor = 'doctor' | 'manager' | 'nurse'
export const WAIT_FOR_LABEL: Record<WaitFor, string> = { doctor: '원장', manager: '실장', nurse: '간호사' }

export interface Room {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  order: number
  tone?: 'clinic' | 'front' | 'support' // 방 색 구분(진료/접수·대기/지원)
  decor?: boolean // true면 환자 카드를 둘 수 없는 장식 공간(화장실 등)
}

export interface Patient {
  id: string
  name: string // 환자 이름 (실명)
  birthDate: string // YYYY-MM-DD
  procedure: string // 수술/시술명
  category?: Category // 분류 (이전 버전 데이터에는 없을 수 있음)
  waitFor?: WaitFor // status가 ready일 때 기다리는 사람 (없으면 원장)
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

export interface Move {
  id: string
  patientId: string
  fromRoomId: string | null // 카드 생성 시에는 null
  toRoomId: string
  status: PatientStatus
  waitFor?: WaitFor
  at: number
}

export function statusLabel(p: { status: PatientStatus; waitFor?: WaitFor }): string {
  return p.status === 'ready' ? `${WAIT_FOR_LABEL[p.waitFor ?? 'doctor']} 대기` : STATUS_LABEL[p.status]
}
