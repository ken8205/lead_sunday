import type { Move, Patient } from '../types'

// 각 환자가 "마지막으로 바뀐 시각"을 이동 기록에서 찾아 붙인다.
// 등록, 방 이동, 상태 변경(대상 변경 포함) 중 가장 최근 기록이 기준이다. 카드의 큰 숫자는 이 시각부터 센다.
export function withChangedAt(patients: Patient[], moves: Move[]): Patient[] {
  const latest = new Map<string, number>()
  for (const m of moves) {
    if ((latest.get(m.patientId) ?? 0) < m.at) latest.set(m.patientId, m.at)
  }
  return patients.map((p) => ({ ...p, changedAt: Math.max(latest.get(p.id) ?? 0, p.enteredRoomAt) }))
}
