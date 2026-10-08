import { useEffect, useState } from 'react'
import type { Room } from '../types'
import { defaultRooms } from '../data/defaultRooms'

// 설정 화면에서 바꾼 방 목록을 브라우저에 저장한다. 7단계에서 서버 저장으로 교체 예정.
const KEY = 'patient-board:rooms:v4'

function load(): Room[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const v = JSON.parse(raw) as Room[]
      if (Array.isArray(v) && v.length > 0) return v
    }
  } catch {
    // 기본 방 목록 사용
  }
  return defaultRooms
}

export function useRooms() {
  const [rooms, setRooms] = useState<Room[]>(load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(rooms))
    } catch {
      // 저장 실패는 무시
    }
  }, [rooms])
  return { rooms, setRooms }
}
