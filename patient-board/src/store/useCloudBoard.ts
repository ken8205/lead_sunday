import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Move, Patient, PatientStatus, WaitFor } from '../types'
import type { BoardApi, NewPatient } from './useBoard'
import { iso, toMove, toPatient } from './mappers'
import type { MoveRow, PatientRow } from './mappers'

// 서버 모드: Supabase에 저장하고, 다른 기기의 변경을 실시간으로 받아 화면을 갱신한다.
// 변경은 화면에 먼저 반영(낙관적 갱신)한 뒤 서버에 쓰고, 실패하면 서버 상태로 되돌린다.
const POLL_MS = 15000 // 실시간 연결이 끊겨도 15초 안에 따라잡는 안전망

const uid = () => crypto.randomUUID()

export function useCloudBoard(): BoardApi {
  const sb = supabase!
  const [patients, setPatients] = useState<Patient[]>([])
  const [moves, setMoves] = useState<Move[]>([])
  const [ranks, setRanks] = useState<Record<string, number>>({})
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const patientsRef = useRef<Patient[]>([])
  patientsRef.current = patients
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    const [p, m] = await Promise.all([sb.from('patients').select('*'), sb.from('moves').select('*').order('at', { ascending: true })])
    if (p.error || m.error) {
      setError(`서버에서 불러오지 못했습니다: ${(p.error ?? m.error)!.message}`)
      return
    }
    setError(null)
    const rows = p.data as PatientRow[]
    setPatients(rows.map(toPatient))
    setRanks(Object.fromEntries(rows.filter((r) => r.queue_rank !== null).map((r) => [r.id, r.queue_rank as number])))
    setMoves((m.data as MoveRow[]).map(toMove))
    setReady(true)
  }, [sb])

  const scheduleLoad = useCallback(() => {
    if (reloadTimer.current) clearTimeout(reloadTimer.current)
    reloadTimer.current = setTimeout(load, 150)
  }, [load])

  useEffect(() => {
    load()
    const ch = sb
      .channel('board-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'patients' }, scheduleLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'moves' }, scheduleLoad)
      .subscribe()
    const t = setInterval(load, POLL_MS)
    return () => {
      sb.removeChannel(ch)
      clearInterval(t)
      if (reloadTimer.current) clearTimeout(reloadTimer.current)
    }
  }, [sb, load, scheduleLoad])

  // 서버 쓰기. 실패하면 오류를 보여 주고 서버 상태로 되돌린다.
  const write = useCallback(
    async (...ops: PromiseLike<{ error: { message: string } | null }>[]) => {
      for (const op of ops) {
        const { error: e } = await op
        if (e) {
          setError(`저장하지 못했습니다: ${e.message}`)
          await load()
          return
        }
      }
      setError(null)
    },
    [load],
  )

  const addPatient = useCallback(
    (input: NewPatient, roomId: string) => {
      const now = Date.now()
      const p: Patient = { id: uid(), ...input, roomId, status: 'waiting', enteredRoomAt: now, createdAt: now }
      const m: Move = { id: uid(), patientId: p.id, fromRoomId: null, toRoomId: roomId, status: 'waiting', at: now }
      setPatients((s) => [...s, p])
      setMoves((s) => [...s, m])
      void write(
        sb.from('patients').insert({
          id: p.id,
          name: p.name,
          birth_date: p.birthDate,
          procedure: p.procedure,
          category: p.category ?? null,
          staff: p.staff,
          room_id: roomId,
          status: 'waiting',
          entered_room_at: iso(now),
        }),
        sb.from('moves').insert({ id: m.id, patient_id: p.id, from_room_id: null, to_room_id: roomId, status: 'waiting', at: iso(now) }),
      )
    },
    [sb, write],
  )

  const movePatient = useCallback(
    (patientId: string, toRoomId: string) => {
      const p = patientsRef.current.find((x) => x.id === patientId)
      if (!p || p.roomId === toRoomId) return
      const now = Date.now()
      const m: Move = { id: uid(), patientId, fromRoomId: p.roomId, toRoomId, status: p.status, waitFor: p.waitFor, at: now }
      setPatients((s) => s.map((x) => (x.id === patientId ? { ...x, roomId: toRoomId, enteredRoomAt: now } : x)))
      setMoves((s) => [...s, m])
      void write(
        sb.from('patients').update({ room_id: toRoomId, entered_room_at: iso(now) }).eq('id', patientId),
        sb.from('moves').insert({ id: m.id, patient_id: patientId, from_room_id: p.roomId, to_room_id: toRoomId, status: p.status, wait_for: p.waitFor ?? null, at: iso(now) }),
      )
    },
    [sb, write],
  )

  const setStatus = useCallback(
    (patientId: string, status: PatientStatus, waitFor?: WaitFor) => {
      const p = patientsRef.current.find((x) => x.id === patientId)
      const target = status === 'ready' ? (waitFor ?? 'doctor') : undefined
      if (!p || (p.status === status && p.waitFor === target)) return
      const now = Date.now()
      const m: Move = { id: uid(), patientId, fromRoomId: p.roomId, toRoomId: p.roomId, status, waitFor: target, at: now }
      setPatients((s) => s.map((x) => (x.id === patientId ? { ...x, status, waitFor: target } : x)))
      setMoves((s) => [...s, m])
      void write(
        sb.from('patients').update({ status, wait_for: target ?? null }).eq('id', patientId),
        sb.from('moves').insert({ id: m.id, patient_id: patientId, from_room_id: p.roomId, to_room_id: p.roomId, status, wait_for: target ?? null, at: iso(now) }),
      )
    },
    [sb, write],
  )

  const removePatient = useCallback(
    (patientId: string) => {
      setPatients((s) => s.filter((x) => x.id !== patientId))
      setMoves((s) => s.filter((m) => m.patientId !== patientId))
      void write(sb.from('patients').delete().eq('id', patientId)) // 이동 기록은 함께 삭제됨
    },
    [sb, write],
  )

  const order = useMemo(
    () =>
      Object.entries(ranks)
        .sort((a, b) => a[1] - b[1])
        .map(([id]) => id),
    [ranks],
  )

  // 먼저 볼 순서를 서버에 저장해 모든 기기에서 같은 순서로 보이게 한다.
  const setOrder = useCallback(
    (next: string[]) => {
      const nextRanks = Object.fromEntries(next.map((id, i) => [id, i]))
      const changed = [
        ...next.filter((id) => ranks[id] !== nextRanks[id]).map((id) => ({ id, rank: nextRanks[id] as number | null })),
        ...Object.keys(ranks).filter((id) => !(id in nextRanks)).map((id) => ({ id, rank: null as number | null })),
      ]
      setRanks(nextRanks)
      void write(...changed.map((c) => sb.from('patients').update({ queue_rank: c.rank }).eq('id', c.id)))
    },
    [sb, write, ranks],
  )

  // 오늘 이전에 귀가한 카드는 보드에서 내리고 기록에만 남긴다 (서버에서는 7일 뒤 삭제).
  const { visible, archive } = useMemo(() => {
    const todayStart = new Date().setHours(0, 0, 0, 0)
    const leftAt = (p: Patient) => moves.filter((m) => m.patientId === p.id && m.status === 'left').reduce((t, m) => Math.max(t, m.at), p.createdAt)
    const old = (p: Patient) => p.status === 'left' && leftAt(p) < todayStart
    return { visible: patients.filter((p) => !old(p)), archive: patients.filter(old) }
  }, [patients, moves])

  return { patients: visible, archive, moves, order, setOrder, addPatient, movePatient, setStatus, removePatient, ready, error }
}
