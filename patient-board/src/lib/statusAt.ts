import type { Move, Patient } from '../types'

// 각 환자가 "현재 상태가 된 시각"을 이동 기록에서 찾아 붙인다.
// 상태 변경 기록(출발 방 = 도착 방)과 카드 생성 기록(출발 방 없음)만 보고, 방 이동 기록은 무시한다.
export function withStatusAt(patients: Patient[], moves: Move[]): Patient[] {
  const latest = new Map<string, number>()
  for (const m of moves) {
    if (m.fromRoomId !== null && m.fromRoomId !== m.toRoomId) continue
    const key = `${m.patientId}|${m.status}`
    if ((latest.get(key) ?? 0) < m.at) latest.set(key, m.at)
  }
  return patients.map((p) => ({ ...p, statusAt: latest.get(`${p.id}|${p.status}`) ?? p.enteredRoomAt }))
}
