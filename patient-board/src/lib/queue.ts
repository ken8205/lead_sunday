import type { Patient } from '../types'

// 기본은 오래 기다린 순. 손으로 정한 순서(order)가 있는 환자는 그 순서로 먼저 나온다.
export function sortQueue(list: Patient[], order: string[]): Patient[] {
  const rank = (id: string) => {
    const i = order.indexOf(id)
    return i === -1 ? Infinity : i
  }
  return [...list].sort((a, b) => rank(a.id) - rank(b.id) || a.enteredRoomAt - b.enteredRoomAt)
}
