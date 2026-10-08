import { useState } from 'react'

interface Props {
  onChange: (current: string, next: string) => Promise<string | null> // 실패하면 안내 문구, 성공하면 null
  onClose: () => void
}

const MIN_LENGTH = 8

export function ChangePasswordDialog({ onChange, onClose }: Props) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const mismatch = again.length > 0 && next !== again
  const valid = current !== '' && next.length >= MIN_LENGTH && next === again && next !== current

  return (
    <div className="overlay" onClick={busy ? undefined : onClose}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={async (e) => {
          e.preventDefault()
          if (!valid || busy) return
          setBusy(true)
          setError(null)
          const msg = await onChange(current, next)
          setBusy(false)
          if (msg) setError(msg)
          else setDone(true)
        }}
      >
        <h2>비밀번호 변경</h2>
        {done ? (
          <>
            <p className="help">비밀번호를 바꿨습니다. 다음 로그인부터 새 비밀번호를 쓰세요.</p>
            <div className="dialog-actions">
              <button type="button" className="btn btn-primary" onClick={onClose}>
                확인
              </button>
            </div>
          </>
        ) : (
          <>
            <label>
              현재 비밀번호
              <input type="password" autoComplete="current-password" autoFocus value={current} onChange={(e) => setCurrent(e.target.value)} />
            </label>
            <label>
              새 비밀번호 ({MIN_LENGTH}자 이상)
              <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} />
            </label>
            {tooShort && <p className="login-error">{MIN_LENGTH}자 이상으로 정해 주세요.</p>}
            <label>
              새 비밀번호 한 번 더
              <input type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} />
            </label>
            {mismatch && <p className="login-error">새 비밀번호가 서로 다릅니다.</p>}
            {next !== '' && next === current && <p className="login-error">현재 비밀번호와 다른 비밀번호를 정해 주세요.</p>}
            {error && <p className="login-error">{error}</p>}
            <div className="dialog-actions">
              <button type="button" className="btn" onClick={onClose} disabled={busy}>
                취소
              </button>
              <button type="submit" className="btn btn-primary" disabled={!valid || busy}>
                {busy ? '바꾸는 중…' : '바꾸기'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}
