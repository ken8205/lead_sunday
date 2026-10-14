import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { Role } from '../types'

export interface StaffUser {
  id: string
  name: string
  role: Role
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'out' }
  | { status: 'denied'; email: string } // 로그인은 됐지만 활성 직원이 아님 (퇴사 처리 등)
  | { status: 'in'; user: StaffUser }

const RECHECK_MS = 60000 // 퇴사 처리(비활성화)가 1분 안에 반영되도록 주기적으로 다시 확인

// 로그인 상태와 "활성 직원인지"를 함께 관리한다. 서버 모드에서만 사용한다.
export function useAuth() {
  const sb = supabase!
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const check = useCallback(
    async (session: Session | null) => {
      if (!session) {
        setState({ status: 'out' })
        return
      }
      const { data, error } = await sb.from('staff').select('id, name, role, active').eq('id', session.user.id).maybeSingle()
      if (error) return // 일시적 오류면 현재 상태 유지
      if (data && data.active) setState({ status: 'in', user: { id: data.id, name: data.name, role: data.role } })
      else setState({ status: 'denied', email: session.user.email ?? '' })
    },
    [sb],
  )

  useEffect(() => {
    sb.auth.getSession().then(({ data }) => check(data.session))
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => check(session), 0) // 콜백 안에서 바로 서버를 부르면 멈출 수 있어 한 박자 늦춘다
    })
    const t = setInterval(() => sb.auth.getSession().then(({ data }) => check(data.session)), RECHECK_MS)
    return () => {
      sub.subscription.unsubscribe()
      clearInterval(t)
    }
  }, [sb, check])

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await sb.auth.signInWithPassword({ email: email.trim(), password })
      if (error) return '이메일 또는 비밀번호가 맞지 않습니다.'
      return null
    },
    [sb],
  )

  // 본인 비밀번호 변경. 열려 있는 화면을 다른 사람이 쓰는 경우를 막으려고 현재 비밀번호로 다시 확인한다.
  const changePassword = useCallback(
    async (current: string, next: string): Promise<string | null> => {
      const { data } = await sb.auth.getSession()
      const email = data.session?.user.email
      if (!email) return '로그인 정보를 찾을 수 없습니다. 다시 로그인해 주세요.'
      const check = await sb.auth.signInWithPassword({ email, password: current })
      if (check.error) return '현재 비밀번호가 맞지 않습니다.'
      const { error } = await sb.auth.updateUser({ password: next })
      if (error) return `비밀번호를 바꾸지 못했습니다: ${error.message}`
      return null
    },
    [sb],
  )

  const signOut = useCallback(async () => {
    await sb.auth.signOut()
  }, [sb])

  return { state, signIn, signOut, changePassword }
}
