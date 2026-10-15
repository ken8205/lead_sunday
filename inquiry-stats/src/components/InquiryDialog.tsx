import { useState } from 'react'
import type { Inquiry, NewInquiry, Stage } from '../inquiries'
import type { OptionKind, OptionLists } from '../inquiries'
import { STAGES, STAGE_LABEL, localDate } from '../inquiries'

interface Props {
  initial?: Inquiry // 있으면 수정
  staffSuggestions?: string[]
  campaignSuggestions: string[]
  options: OptionLists
  onAddOption?: (kind: OptionKind, name: string) => void // 원장·실장만: 입력하다가 목록에 바로 추가
  onSubmit: (i: NewInquiry) => void
  onClose: () => void
}

// 드롭다운 대신 눌러서 고르는 버튼 묶음. 같은 버튼을 다시 누르면 선택이 풀린다. 순서는 "항목 관리"에서 정한 순서.
function Chips({ label, value, options, onChange, required, onAdd }: { label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean; onAdd?: (name: string) => void }) {
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

export function InquiryDialog({ initial, staffSuggestions = [], campaignSuggestions, options, onAddOption, onSubmit, onClose }: Props) {
  const today = localDate()
  const [f, setF] = useState<NewInquiry>(() => ({
    date: initial?.date ?? today,
    channel: initial?.channel ?? '',
    source: initial?.source ?? '',
    campaign: initial?.campaign ?? '',
    nationality: initial?.nationality ?? '한국',
    interest: initial?.interest ?? '',
    stage: initial?.stage ?? 'inquiry',
    amount: initial?.amount ?? null,
    paidDate: initial?.paidDate ?? null,
    note: initial?.note ?? '',
    staff: initial?.staff ?? '',
  }))
  const [more, setMore] = useState(() => !!(initial && (initial.campaign || initial.note || initial.staff || initial.date !== today)))
  const set = <K extends keyof NewInquiry>(k: K, v: NewInquiry[K]) => setF((x) => ({ ...x, [k]: v }))
  const valid = f.date !== '' && f.channel !== '' && f.source !== ''

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="dialog sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          const paid = f.stage === 'paid'
          onSubmit({ ...f, campaign: f.campaign.trim(), note: f.note.trim(), staff: f.staff.trim(), amount: paid ? f.amount : null, paidDate: paid ? (f.paidDate ?? today) : null })
        }}
      >
        <div className="sheet-head">
          <h2>{initial ? '문의 수정' : '새 문의'}</h2>
          <span className="help">{f.date === today ? '오늘' : f.date}</span>
        </div>

        <Chips label="문의 채널" value={f.channel} options={options.channel} onChange={(v) => set('channel', v)} onAdd={onAddOption && ((n) => onAddOption('channel', n))} required />
        <Chips label="유입 경로" value={f.source} options={options.source} onChange={(v) => set('source', v)} onAdd={onAddOption && ((n) => onAddOption('source', n))} required />
        <Chips label="국적" value={f.nationality} options={options.nationality} onChange={(v) => set('nationality', v)} onAdd={onAddOption && ((n) => onAddOption('nationality', n))} />
        <Chips label="관심 시술" value={f.interest} options={options.interest} onChange={(v) => set('interest', v)} onAdd={onAddOption && ((n) => onAddOption('interest', n))} />

        <fieldset className="chips">
          <legend>단계</legend>
          <div className="stepper">
            {STAGES.map((s: Stage) => (
              <button type="button" key={s} className={`step step-${s}${f.stage === s ? ' on' : ''}`} aria-pressed={f.stage === s} onClick={() => set('stage', s)}>
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>

        {f.stage === 'paid' && (
          <div className="form-grid">
            <label>
              결제 금액 (만원)
              <input id="inq-amount" type="number" inputMode="numeric" min={0} autoFocus value={f.amount ?? ''} onChange={(e) => set('amount', e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))))} />
            </label>
            <label>
              결제일
              <input id="inq-paid" type="date" value={f.paidDate ?? today} min={f.date} max={today} onChange={(e) => set('paidDate', e.target.value || null)} />
            </label>
          </div>
        )}

        {more ? (
          <div className="form-grid">
            <label>
              문의일
              <input id="inq-date" type="date" value={f.date} max={today} onChange={(e) => set('date', e.target.value)} />
            </label>
            <label>
              광고·이벤트 이름
              <input id="inq-campaign" list="campaign-list" value={f.campaign} placeholder="예: 10월 인스타 실리프팅" onChange={(e) => set('campaign', e.target.value)} />
              <datalist id="campaign-list">
                {campaignSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label>
              담당자
              <input id="inq-staff" list="inq-staff-list" value={f.staff} onChange={(e) => set('staff', e.target.value)} />
              <datalist id="inq-staff-list">
                {staffSuggestions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label>
              메모 (이니셜 정도만)
              <input id="inq-note" maxLength={100} value={f.note} placeholder="예: K.H. / 재문의" onChange={(e) => set('note', e.target.value)} />
            </label>
            <p className="help wide">이름·연락처·생년월일은 적지 마세요. 통계용으로 오래 보관하는 대장입니다.</p>
          </div>
        ) : (
          <button type="button" className="linkish" onClick={() => setMore(true)}>
            + 날짜·광고 이름·담당자·메모
          </button>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary btn-big" disabled={!valid}>
            {valid ? '저장' : '채널과 경로를 골라 주세요'}
          </button>
        </div>
      </form>
    </div>
  )
}
