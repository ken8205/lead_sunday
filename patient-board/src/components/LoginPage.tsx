import { useState } from 'react'

interface Props {
  onSignIn: (email: string, password: string) => Promise<string | null>
}

export function LoginPage({ onSignIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="login">
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError(null)
          const msg = await onSignIn(email, password)
          setBusy(false)
          if (msg) setError(msg)
        }}
      >
        <h1>페이스플러스 환자 동선 보드</h1>
        <p className="note">직원 개인 계정으로 로그인하세요.</p>
        <label>
          이메일
          <input type="email" autoComplete="username" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          비밀번호
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={busy || !email || !password}>
          {busy ? '로그인 중…' : '로그인'}
        </button>
        <p className="help">계정이 없거나 비밀번호를 잊었으면 원장님께 문의하세요.</p>
      </form>
    </div>
  )
}
