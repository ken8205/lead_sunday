import { useState } from 'react'
import { InquiryLedger } from './components/InquiryLedger'
import { StatsPage } from './components/StatsPage'
import { OptionsPage } from './components/OptionsPage'
import { LoginPage } from './components/LoginPage'
import { ChangePasswordDialog } from './components/ChangePasswordDialog'
import { useInquiries } from './store/useInquiries'
import { useAuth } from './hooks/useAuth'
import type { StaffUser } from './hooks/useAuth'
import { useStaffList } from './hooks/useStaffList'
import { isCloud } from './lib/supabase'
import { ROLE_LABEL } from './types'
import { buildHash, useHashRoute } from './hooks/useHashRoute'

type View = 'ledger' | 'stats' | 'options'

interface MainProps {
  user?: StaffUser // 서버 모드에서 로그인한 직원
  onSignOut?: () => void
  onChangePassword?: (current: string, next: string) => Promise<string | null>
}

function Main({ user, onSignOut, onChangePassword }: MainProps) {
  const inquiries = useInquiries()
  const staffList = useStaffList(isCloud)
  const staffSuggestions = isCloud ? staffList.filter((x) => x.active).map((x) => x.name) : undefined
  const isLead = !user || user.role === 'doctor' || user.role === 'manager' // 원장·실장: 통계, 광고비, 대장 삭제 (항목 관리는 전 직원)
  const { route, go } = useHashRoute()
  const view: View = route.path[0] === 'options' ? 'options' : route.path[0] === 'stats' && isLead ? 'stats' : 'ledger'
  const [changingPw, setChangingPw] = useState(false)

  return (
    <main>
      <header className="topbar">
        <div>
          <h1>페이스플러스 상담 통계</h1>
          <p className="note">{user ? `${user.name}${user.name === ROLE_LABEL[user.role] ? '' : ` ${ROLE_LABEL[user.role]}`} 로그인 중 · 병원 직원끼리만 공유됩니다` : '이 기기의 브라우저에만 저장됩니다'}</p>
        </div>
        <div className="tabs" role="tablist">
          {(
            [
              ['ledger', '상담 대장'],
              ...(isLead ? [['stats', '통계']] : []),
              ['options', '항목 관리'],
            ] as [View, string][]
          ).map(([v, label]) => (
            <button key={v} className={view === v ? 'on' : ''} onClick={() => view !== v && go(buildHash([v]))}>
              {label}
            </button>
          ))}
        </div>
        {onSignOut && (
          <div className="toolbar">
            {onChangePassword && (
              <button className="btn" onClick={() => setChangingPw(true)}>
                비밀번호 변경
              </button>
            )}
            <button className="btn" onClick={onSignOut}>
              로그아웃
            </button>
          </div>
        )}
      </header>

      {inquiries.error && <div className="banner-error">{inquiries.error}</div>}
      {!inquiries.ready && <p className="empty-all">서버에서 불러오는 중…</p>}
      {inquiries.ready && view === 'ledger' && <InquiryLedger api={inquiries} staffSuggestions={staffSuggestions} canDelete={isLead} canEditOptions />}
      {inquiries.ready && view === 'stats' && <StatsPage api={inquiries} canEditCost={isLead} route={route} go={go} />}
      {inquiries.ready && view === 'options' && <OptionsPage api={inquiries} />}

      {changingPw && onChangePassword && <ChangePasswordDialog onChange={onChangePassword} onClose={() => setChangingPw(false)} />}
    </main>
  )
}

function CloudGate() {
  const { state, signIn, signOut, changePassword } = useAuth()
  if (state.status === 'loading') return <p className="empty-all">불러오는 중…</p>
  if (state.status === 'out') return <LoginPage onSignIn={signIn} />
  if (state.status === 'denied')
    return (
      <div className="login">
        <div className="login-card">
          <h1>접근 권한이 없습니다</h1>
          <p className="note">{state.email} 계정은 볼 수 없습니다. 원장님께 문의하세요.</p>
          <button className="btn" onClick={signOut}>
            로그아웃
          </button>
        </div>
      </div>
    )
  return <Main user={state.user} onSignOut={signOut} onChangePassword={changePassword} />
}

export default function App() {
  return isCloud ? <CloudGate /> : <Main />
}
