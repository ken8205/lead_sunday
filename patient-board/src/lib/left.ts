import type { Patient } from '../types'
import { elapsedMinutes } from './time'

// 귀가 처리 후 leftMin분이 지난 카드는 평면도에서 내리고 "귀가" 목록에서 보여 준다.
// 데이터는 그대로(상태는 '귀가') 두고 보이는 위치만 바꾼다.
export function isHiddenLeft(p: Patient, now: number, leftMin: number): boolean {
  return p.status === 'left' && elapsedMinutes(p.statusAt ?? p.enteredRoomAt, now) >= leftMin
}
