import type { Category, Move, Patient, PatientStatus, Room, WaitFor } from '../types'

export interface PatientRow {
  id: string
  name: string
  birth_date: string
  procedure: string
  category: Category | null
  staff: string
  room_id: string
  status: PatientStatus
  wait_for: WaitFor | null
  entered_room_at: string
  created_at: string
  queue_rank: number | null
}

export interface MoveRow {
  id: string
  patient_id: string
  from_room_id: string | null
  to_room_id: string
  status: PatientStatus
  wait_for: WaitFor | null
  at: string
  by_staff: string | null
}

export interface RoomRow {
  id: string
  name: string
  x: number
  y: number
  w: number
  h: number
  ord: number
  tone: Room['tone'] | null
  decor: boolean
}

export const iso = (ms: number) => new Date(ms).toISOString()

export const toPatient = (r: PatientRow): Patient => ({
  id: r.id,
  name: r.name,
  birthDate: r.birth_date,
  procedure: r.procedure,
  category: r.category ?? undefined,
  staff: r.staff,
  roomId: r.room_id,
  status: r.status,
  waitFor: r.wait_for ?? undefined,
  enteredRoomAt: Date.parse(r.entered_room_at),
  createdAt: Date.parse(r.created_at),
})

export const toMove = (r: MoveRow): Move => ({
  id: r.id,
  patientId: r.patient_id,
  fromRoomId: r.from_room_id,
  toRoomId: r.to_room_id,
  status: r.status,
  waitFor: r.wait_for ?? undefined,
  at: Date.parse(r.at),
  by: r.by_staff ?? undefined,
})

export const toRoom = (r: RoomRow): Room => ({
  id: r.id,
  name: r.name,
  x: r.x,
  y: r.y,
  w: r.w,
  h: r.h,
  order: r.ord,
  tone: r.tone ?? undefined,
  decor: r.decor,
})

export const toRoomRow = (r: Room, index: number): RoomRow => ({
  id: r.id,
  name: r.name,
  x: r.x,
  y: r.y,
  w: r.w,
  h: r.h,
  ord: index,
  tone: r.tone ?? null,
  decor: !!r.decor,
})
