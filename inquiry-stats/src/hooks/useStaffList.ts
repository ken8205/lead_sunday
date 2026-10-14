import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

export interface StaffRow {
  id: string
  name: string
  role: Role
  active: boolean
}

// 직원 목록 (담당자 입력 추천, 이동 기록에 "누가 옮겼는지" 표시용). 서버 모드에서만 불러온다.
export function useStaffList(enabled: boolean): StaffRow[] {
  const [list, setList] = useState<StaffRow[]>([])
  useEffect(() => {
    if (!enabled || !supabase) return
    const sb = supabase
    const load = () =>
      sb
        .from('staff')
        .select('id, name, role, active')
        .then(({ data }) => data && setList(data as StaffRow[]))
    load()
    const t = setInterval(load, 300000)
    return () => clearInterval(t)
  }, [enabled])
  return list
}
