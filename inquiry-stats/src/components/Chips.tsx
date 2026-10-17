import { useState } from 'react'

// 드롭다운 대신 눌러서 고르는 버튼 묶음. 같은 버튼을 다시 누르면 선택이 풀린다. 순서는 "항목 관리"에서 정한 순서.
export function Chips({ label, value, options, onChange, required, onAdd }: { label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean; onAdd?: (name: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const all = value && !options.includes(value) ? [...options, value] : options // 목록에서 지운 예전 값도 수정할 때 보이게
  const name = draft.trim()
  const commit = () => {
    if (!name || !onAdd) return
    if (!options.includes(name)) onAdd(name) // 목록 맨 끝에 추가
    onChange(name) // 추가한 것을 바로 선택
    setDraft('')
    setAdding(false)
  }
  return (
    <fieldset className="chips">
      <legend>
        {label}
        {required && !value && <span className="need"> · 골라 주세요</span>}
      </legend>
      <div className="chip-row">
        {all.map((o) => (
          <button type="button" key={o} className={`pick${value === o ? ' on' : ''}`} aria-pressed={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
        {onAdd && !adding && (
          <button type="button" className="pick pick-more" onClick={() => setAdding(true)}>
            + 직접 추가
          </button>
        )}
      </div>
      {adding && (
        <div className="chip-add">
          <input
            autoFocus
            value={draft}
            maxLength={20}
            placeholder={`새 ${label} 이름`}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault() // 문의 저장이 아니라 항목 추가
                if (e.nativeEvent.isComposing) return // 한글 조합 중 Enter는 무시 (마지막 글자가 빠지는 것 방지)
                commit()
              }
              if (e.key === 'Escape') setAdding(false)
            }}
          />
          <button type="button" className="btn btn-primary" onClick={commit}>
            추가
          </button>
          <button type="button" className="btn" onClick={() => setAdding(false)}>
            취소
          </button>
        </div>
      )}
    </fieldset>
  )
}
