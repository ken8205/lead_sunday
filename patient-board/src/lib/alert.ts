import type { Patient } from '../types'
import { elapsedMinutes } from './time'

// 대기 경고 단계.
//  - 대기/호출 대기: redMin 이상 빨강 → +5분 깜박임 → +10분 더 빠른 깜박임 (기본 10 / 15 / 20분)
//  - 퇴원대기: dischargeMin 이상(기본 30분) 초록색 깜박임
export interface AlertConfig {
  redMin: number
  dischargeMin: number
}

export type AlertLevel = 'none' | 'red' | 'blink' | 'fast' | 'green'

export const BLINK_AFTER = 5 // 빨강 시작 후 몇 분 뒤부터 깜박이는가
export const FAST_AFTER = 10 // 빨강 시작 후 몇 분 뒤부터 빠르게 깜박이는가

// 카드의 큰 숫자로 보여 줄 시간의 기준 시각: 퇴원대기는 "퇴원대기가 된 때", 나머지는 "현재 방에 들어온 때"
export function sinceOf(p: Patient): number {
  return p.status === 'discharge' ? (p.statusAt ?? p.enteredRoomAt) : p.enteredRoomAt
}

export function alertLevel(p: Patient, now: number, cfg: AlertConfig): AlertLevel {
  const m = elapsedMinutes(sinceOf(p), now)
  if (p.status === 'discharge') return m >= cfg.dischargeMin ? 'green' : 'none'
  if (p.status !== 'waiting' && p.status !== 'ready') return 'none'
  if (m >= cfg.redMin + FAST_AFTER) return 'fast'
  if (m >= cfg.redMin + BLINK_AFTER) return 'blink'
  if (m >= cfg.redMin) return 'red'
  return 'none'
}
