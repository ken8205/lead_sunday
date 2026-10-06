import { useCallback, useEffect, useState } from 'react'
import type { Move, Patient, PatientStatus } from '../types'

// 1~6단계: 브라우저 localStorage에만 저장한다. 7단계에서 Supabase로 교체할 단일 지점.
const KEY = 'patient-board:v1'

interface State {
  patients: Patient[]
  moves: Move[]
  archive: Patient[] // 하루가 지나 보드에서 내려간 귀가 카드 (기록 표시용)
}

export interface NewPatient {
  name: string
  birthDate: string
  procedure: string
  staff: string
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { archive: [], ...(JSON.parse(raw) as Partial<State>) } as State
  } catch {
    // 저장소를 못 읽으면 빈 보드로 시작
  }
  return { patients: [], moves: [], archive: [] }
}

const uid = () => crypto.randomUUID()

export function useBoard() {
  const [state, setState] = useState<State>(load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // 저장 실패는 무시 (화면은 계속 동작)
    }
  }, [state])

  const addPatient = useCallback((input: NewPatient, roomId: string) => {
    const now = Date.now()
    const p: Patient = {
      id: uid(),
      ...input,
      roomId,
      status: 'waiting',
      enteredRoomAt: now,
      createdAt: now,
    }
    const m: Move = { id: uid(), patientId: p.id, fromRoomId: null, toRoomId: roomId, status: p.status, at: now }
    setState((s) => ({ ...s, patients: [...s.patients, p], moves: [...s.moves, m] }))
  }, [])

  const movePatient = useCallback((patientId: string, toRoomId: string) => {
    setState((s) => {
      const p = s.patients.find((x) => x.id === patientId)
      if (!p || p.roomId === toRoomId) return s
      const now = Date.now()
      const m: Move = { id: uid(), patientId, fromRoomId: p.roomId, toRoomId, status: p.status, at: now }
      return {
        ...s,
        patients: s.patients.map((x) => (x.id === patientId ? { ...x, roomId: toRoomId, enteredRoomAt: now } : x)),
        moves: [...s.moves, m],
      }
    })
  }, [])

  const removePatient = useCallback((patientId: string) => {
    // 잘못 만든 카드 삭제: 카드와 그 이동 기록을 함께 지운다.
    setState((s) => ({
      ...s,
      patients: s.patients.filter((x) => x.id !== patientId),
      moves: s.moves.filter((m) => m.patientId !== patientId),
    }))
  }, [])

  const setStatus = useCallback((patientId: string, status: PatientStatus) => {
    setState((s) => {
      const p = s.patients.find((x) => x.id === patientId)
      if (!p || p.status === status) return s
      const m: Move = { id: uid(), patientId, fromRoomId: p.roomId, toRoomId: p.roomId, status, at: Date.now() }
      return { ...s, patients: s.patients.map((x) => (x.id === patientId ? { ...x, status } : x)), moves: [...s.moves, m] }
    })
  }, [])

  // 오늘 이전에 귀가 처리된 카드는 보드에서 내리고 기록(이동 로그)만 남긴다.
  const sweepLeft = useCallback(() => {
    setState((s) => {
      const todayStart = new Date().setHours(0, 0, 0, 0)
      const leftAt = (p: Patient) =>
        s.moves.filter((m) => m.patientId === p.id && m.status === 'left').reduce((t, m) => Math.max(t, m.at), p.createdAt)
      const old = s.patients.filter((p) => p.status === 'left' && leftAt(p) < todayStart)
      if (old.length === 0) return s
      const ids = new Set(old.map((p) => p.id))
      return { ...s, patients: s.patients.filter((p) => !ids.has(p.id)), archive: [...s.archive, ...old] }
    })
  }, [])

  useEffect(() => {
    sweepLeft()
    const t = setInterval(sweepLeft, 60000)
    return () => clearInterval(t)
  }, [sweepLeft])

  const replaceAll = useCallback((patients: Patient[]) => {
    setState({ patients, moves: [], archive: [] })
  }, [])

  return {
    patients: state.patients,
    archive: state.archive,
    moves: state.moves,
    addPatient,
    movePatient,
    setStatus,
    removePatient,
    replaceAll,
  }
}
