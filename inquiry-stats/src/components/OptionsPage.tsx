import { useState } from 'react'
import type { OptionKind } from '../inquiries'
import { OPTION_KINDS, OPTION_LABEL } from '../inquiries'
import type { InquiriesApi } from '../store/useInquiries'
import { ConfirmButton } from './ConfirmButton'

// 입력 화면 선택지 관리 (원장·실장). 여기서 정한 순서대로 "새 문의" 화면에 버튼이 나온다.
export function OptionsPage({ api }: { api: InquiriesApi }) {
  const [kind, setKind] = useState<OptionKind>('channel')
  const [draft, setDraft] = useState('')
  const items = api.options[kind]
  const used = new Map<string, number>()
  for (const i of api.inquiries) used.set(i[kind], (used.get(i[kind]) ?? 0) + 1)

  const save = (next: string[]) => api.setOptions(kind, next)
  const move = (k: number, d: -1 | 1) => {
    const next = [...items]
    ;[next[k], next[k + d]] = [next[k + d], next[k]]
    save(next)
  }
  const name = draft.trim()
  const dup = items.includes(name)
  const add = () => {
    if (!name || dup) return
    save([...items, name])
    setDraft('')
  }

  return (
    <div className="options-page">
      <section className="panel">
        <div className="panel-head">
          <h2>항목 관리</h2>
          <div className="tabs tabs-small" role="tablist">
            {OPTION_KINDS.map((k) => (
              <button key={k} className={kind === k ? 'on' : ''} onClick={() => setKind(k)}>
                {OPTION_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <p className="help">위에서부터 이 순서대로 "새 문의" 화면에 나옵니다. 지워도 이미 기록된 문의와 통계는 그대로 남습니다.</p>

        <ol className="opt-list">
          {items.map((o, k) => (
            <li key={o}>
              <span className="opt-num">{k + 1}</span>
              <span className="opt-name">{o}</span>
              <span className="opt-used">{used.get(o) ? `${used.get(o)}건 기록` : ''}</span>
              <button className="btn btn-small" aria-label={`${o} 위로`} disabled={k === 0} onClick={() => move(k, -1)}>
                ▲
              </button>
              <button className="btn btn-small" aria-label={`${o} 아래로`} disabled={k === items.length - 1} onClick={() => move(k, 1)}>
                ▼
              </button>
              <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => save(items.filter((x) => x !== o))} />
            </li>
          ))}
        </ol>

        <form
          className="opt-add"
          onSubmit={(e) => {
            e.preventDefault()
            add()
          }}
        >
          <input id={`opt-new-${kind}`} value={draft} maxLength={20} placeholder={`새 ${OPTION_LABEL[kind]} 이름`} onChange={(e) => setDraft(e.target.value)} />
          <button type="submit" className="btn btn-primary" disabled={!name || dup}>
            추가
          </button>
        </form>
        {dup && <p className="help need">이미 있는 이름입니다.</p>}
      </section>
    </div>
  )
}
