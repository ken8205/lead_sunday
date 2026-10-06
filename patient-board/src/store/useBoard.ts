import { useCallback, useEffect, useState } from 'react'
import type { Move, Patient } from '../types'

// 1~6단계: 브라우저 localStorage에만 저장한다. 7단계에서 Supabase로 교체할 단일 지점.
const KEY = 'patient-board:v1'

interface State {
  patients: Patient[]
  moves: Move[]
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
    if (raw) return JSON.parse(raw) as State
  } catch {
    // 저장소를 못 읽으면 빈 보드로 시작
  }
  return { patients: [], moves: [] }
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
    setState((s) => ({ patients: [...s.patients, p], moves: [...s.moves, m] }))
  }, [])

  const movePatient = useCallback((patientId: string, toRoomId: string) => {
    setState((s) => {
      const p = s.patients.find((x) => x.id === patientId)
      if (!p || p.roomId === toRoomId) return s
      const now = Date.now()
      const m: Move = { id: uid(), patientId, fromRoomId: p.roomId, toRoomId, status: p.status, at: now }
      return {
        patients: s.patients.map((x) => (x.id === patientId ? { ...x, roomId: toRoomId, enteredRoomAt: now } : x)),
        moves: [...s.moves, m],
      }
    })
  }, [])

  const removePatient = useCallback((patientId: string) => {
    setState((s) => ({ ...s, patients: s.patients.filter((x) => x.id !== patientId) }))
  }, [])

  const replaceAll = useCallback((patients: Patient[]) => {
    setState({ patients, moves: [] })
  }, [])

  return { patients: state.patients, moves: state.moves, addPatient, movePatient, removePatient, replaceAll }
}
