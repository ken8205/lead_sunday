import { isCloud } from '../lib/supabase'
import { useLocalBoard } from './useBoard'
import type { BoardApi } from './useBoard'
import { useCloudBoard } from './useCloudBoard'
import { useRooms } from './useRooms'
import { useCloudRooms } from './useCloudRooms'
import type { Room } from '../types'

// 빌드 시점에 서버 설정이 있는지로 한 번 정해진다 (실행 중에 바뀌지 않으므로 훅 규칙에 어긋나지 않는다).
export const useBoardStore: () => BoardApi = isCloud ? useCloudBoard : useLocalBoard

export interface RoomsApi {
  rooms: Room[]
  setRooms: (rooms: Room[]) => void
  ready: boolean
}
export const useRoomsStore: () => RoomsApi = isCloud
  ? useCloudRooms
  : () => {
      const { rooms, setRooms } = useRooms()
      return { rooms, setRooms, ready: true }
    }
