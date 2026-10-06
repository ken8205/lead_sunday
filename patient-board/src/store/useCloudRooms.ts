import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Room } from '../types'
import { defaultRooms } from '../data/defaultRooms'
import { toRoom, toRoomRow } from './mappers'
import type { RoomRow } from './mappers'

// 서버 모드의 방 목록. 설정에서 바꾸면 잠시 뒤(0.6초) 서버에 저장하고 다른 기기에도 반영된다.
// 서버에 방이 하나도 없으면(처음 한 번) 기본 방 배치를 올린다.
export function useCloudRooms() {
  const sb = supabase!
  const [rooms, setRoomsState] = useState<Room[]>(defaultRooms)
  const [ready, setReady] = useState(false)
  const synced = useRef<Set<string>>(new Set())
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null)

  const load = useCallback(async () => {
    if (pending.current) return // 내가 바꾼 내용이 저장되기 전에는 덮어쓰지 않는다
    const { data, error } = await sb.from('rooms').select('*').order('ord', { ascending: true })
    if (error) return
    if (data.length === 0) {
      const { error: e } = await sb.from('rooms').upsert(defaultRooms.map(toRoomRow), { onConflict: 'id', ignoreDuplicates: true })
      if (!e) {
        synced.current = new Set(defaultRooms.map((r) => r.id))
        setRoomsState(defaultRooms)
        setReady(true)
      }
      return
    }
    synced.current = new Set((data as RoomRow[]).map((r) => r.id))
    setRoomsState((data as RoomRow[]).map(toRoom))
    setReady(true)
  }, [sb])

  useEffect(() => {
    load()
    const ch = sb
      .channel('rooms-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, load)
      .subscribe()
    const t = setInterval(load, 30000)
    return () => {
      sb.removeChannel(ch)
      clearInterval(t)
    }
  }, [sb, load])

  const setRooms = useCallback(
    (next: Room[]) => {
      setRoomsState(next)
      if (pending.current) clearTimeout(pending.current)
      pending.current = setTimeout(async () => {
        pending.current = null
        const removed = [...synced.current].filter((id) => !next.some((r) => r.id === id))
        await sb.from('rooms').upsert(next.map(toRoomRow), { onConflict: 'id' })
        if (removed.length > 0) await sb.from('rooms').delete().in('id', removed)
        synced.current = new Set(next.map((r) => r.id))
      }, 600)
    },
    [sb],
  )

  return { rooms, setRooms, ready }
}
