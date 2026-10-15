import { useState } from 'react'
import type { Inquiry, NewInquiry, Stage } from '../inquiries'
import type { OptionKind, OptionLists } from '../inquiries'
import { STAGES, STAGE_LABEL, localDate, normalizeBirth, stageFieldsFor } from '../inquiries'

interface Props {
  initial?: Inquiry // 있으면 수정
  options: OptionLists
  onAddOption?: (kind: OptionKind, name: string) => void // 입력하다가 목록에 바로 추가 (전 직원)
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

const numOrNull = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v))))

export function InquiryDialog({ initial, options, onAddOption, onSubmit, onClose }: Props) {
  const today = localDate()
  const [f, setF] = useState<NewInquiry>(() => ({
    date: initial?.date ?? today,
    patientName: initial?.patientName ?? '',
    birthDate: initial?.birthDate ?? null,
    channel: initial?.channel ?? '',
    source: initial?.source ?? '',
    nationality: initial?.nationality ?? '한국',
    interest: initial?.interest ?? '',
    stage: initial?.stage ?? 'inquiry',
    bookedDate: initial?.bookedDate ?? null,
    consultAt: initial?.consultAt ?? null,
    visitedDate: initial?.visitedDate ?? null,
    reservedDate: initial?.reservedDate ?? null,
    surgeryDate: initial?.surgeryDate ?? null,
    amount: initial?.amount ?? null,
    paidDate: initial?.paidDate ?? null,
    canceledDate: initial?.canceledDate ?? null,
    note: initial?.note ?? '',
  }))
  const [birthRaw, setBirthRaw] = useState(initial?.birthDate ?? '')
  const [more, setMore] = useState(() => !!(initial && initial.date !== today))
  const set = <K extends keyof NewInquiry>(k: K, v: NewInquiry[K]) => setF((x) => ({ ...x, [k]: v }))
  const money = f.stage === 'reserved' || f.stage === 'paid' || f.stage === 'canceled'
  const birthBad = birthRaw.trim() !== '' && !normalizeBirth(birthRaw)
  const valid = f.date !== '' && f.channel !== '' && f.source !== '' && (!money || (f.amount ?? 0) > 0) && !birthBad

  // 단계별 날짜 칸: [필드, 이름] — 지금 단계에서 의미 있는 날짜만 보여 준다
  const dateField = (k: 'paidDate' | 'canceledDate' | 'surgeryDate', label: string, min?: string, max?: string) => (
    <label>
      {label}
      <input id={`inq-${k}`} type="date" value={f[k] ?? (k === 'surgeryDate' ? '' : today)} min={min} max={max} onChange={(e) => set(k, e.target.value || null)} />
    </label>
  )

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="dialog sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onSubmit({ ...f, ...stageFieldsFor(f.stage, f, today), patientName: f.patientName.trim(), birthDate: normalizeBirth(birthRaw), note: f.note.trim() })
        }}
      >
        <div className="sheet-head">
          <h2>{initial ? '문의 수정' : '새 문의'}</h2>
          <span className="help">{f.date === today ? '오늘' : f.date}</span>
        </div>

        <fieldset className="who">
          <legend>
            환자 <small>(알 때만 · 모르면 비워 두세요)</small>
          </legend>
          <div className="who-row">
            <input id="inq-name" maxLength={40} value={f.patientName} placeholder="이름" autoComplete="off" onChange={(e) => set('patientName', e.target.value)} />
            <input
              id="inq-birth"
              inputMode="numeric"
              maxLength={10}
              value={birthRaw}
              placeholder="생년월일 750314"
              autoComplete="off"
              aria-invalid={birthBad}
              onChange={(e) => setBirthRaw(e.target.value)}
              onBlur={() => {
                const b = normalizeBirth(birthRaw)
                if (b) setBirthRaw(b)
              }}
            />
          </div>
          {birthBad && <span className="help need">생년월일을 알아볼 수 없습니다. 예: 750314, 19750314, 1975-03-14</span>}
          <input id="inq-note" maxLength={100} value={f.note} placeholder="메모 (선택) 예: 50대 여, 재문의" onChange={(e) => set('note', e.target.value)} />
        </fieldset>

        <Chips label="문의 채널" value={f.channel} options={options.channel} onChange={(v) => set('channel', v)} onAdd={onAddOption && ((n) => onAddOption('channel', n))} required />
        <Chips label="유입 경로" value={f.source} options={options.source} onChange={(v) => set('source', v)} onAdd={onAddOption && ((n) => onAddOption('source', n))} required />
        <Chips label="국적" value={f.nationality} options={options.nationality} onChange={(v) => set('nationality', v)} onAdd={onAddOption && ((n) => onAddOption('nationality', n))} />
        <Chips label="관심 시술" value={f.interest} options={options.interest} onChange={(v) => set('interest', v)} onAdd={onAddOption && ((n) => onAddOption('interest', n))} />

        <fieldset className="chips">
          <legend>단계</legend>
          <div className="stepper">
            {[...STAGES, 'canceled' as Stage].map((s) => (
              <button type="button" key={s} className={`step step-${s}${f.stage === s ? ' on' : ''}`} aria-pressed={f.stage === s} onClick={() => set('stage', s)}>
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
        </fieldset>

        {(f.stage === 'booked' || f.stage === 'visited') && (
          <div className="pay-box">
            <div className="form-grid">
              <label>
                상담 {f.stage === 'booked' ? '예정일' : '한 날'}
                <input
                  id="inq-consult-day"
                  type="date"
                  min={f.date}
                  value={(f.consultAt ?? '').slice(0, 10) || (f.stage === 'visited' ? (f.visitedDate ?? today) : '')}
                  onChange={(e) => set('consultAt', e.target.value ? e.target.value + (f.consultAt && f.consultAt.length > 10 ? f.consultAt.slice(10) : '') : null)}
                />
              </label>
              <label>
                시간 <small>(선택)</small>
                <input
                  id="inq-consult-time"
                  type="time"
                  step={600}
                  value={(f.consultAt ?? '').slice(11, 16)}
                  onChange={(e) => {
                    const day = (f.consultAt ?? '').slice(0, 10) || (f.stage === 'visited' ? (f.visitedDate ?? today) : today)
                    set('consultAt', e.target.value ? `${day}T${e.target.value}` : day)
                  }}
                />
              </label>
            </div>
            {f.stage === 'booked' && <p className="help pay-note">예정 일시를 적어 두면 대장의 "진행 중"에서 그날 상담 순서대로 찾을 수 있습니다.</p>}
          </div>
        )}

        {money && (
          <div className="pay-box">
            <div className="form-grid">
              <label>
                총액 (만원)
                <input id="inq-amount" type="number" inputMode="numeric" min={0} autoFocus value={f.amount ?? ''} onChange={(e) => set('amount', numOrNull(e.target.value))} />
              </label>
              {(f.stage === 'reserved' || f.stage === 'canceled') && dateField('surgeryDate', '수술 예정일', f.date)}
              {f.stage === 'paid' && dateField('paidDate', '결제 완료한 날', f.date, today)}
              {f.stage === 'canceled' && dateField('canceledDate', '취소한 날', f.date, today)}
            </div>
            {f.stage === 'reserved' && <p className="help pay-note">수술 당일 완불하면 카드의 "결제 완료"를 누르세요.</p>}
          </div>
        )}

        {more ? (
          <div className="form-grid">
            <label>
              문의일
              <input id="inq-date" type="date" value={f.date} max={today} onChange={(e) => set('date', e.target.value)} />
            </label>
            {f.bookedDate && (
              <label>
                상담 예약한 날
                <input id="inq-booked" type="date" value={f.bookedDate} min={f.date} max={today} onChange={(e) => set('bookedDate', e.target.value || null)} />
              </label>
            )}
            {f.visitedDate && (
              <label>
                내원 상담한 날
                <input id="inq-visited" type="date" value={f.visitedDate} min={f.date} max={today} onChange={(e) => set('visitedDate', e.target.value || null)} />
              </label>
            )}
            {f.reservedDate && (
              <label>
                수술 예약한 날
                <input id="inq-reserved" type="date" value={f.reservedDate} min={f.date} max={today} onChange={(e) => set('reservedDate', e.target.value || null)} />
              </label>
            )}
          </div>
        ) : (
          <button type="button" className="linkish" onClick={() => setMore(true)}>
            + 문의일·단계 날짜 고치기
          </button>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary btn-big" disabled={!valid}>
            {valid ? '저장' : birthBad ? '생년월일을 확인해 주세요' : money && !(f.amount ?? 0) ? '총액을 입력해 주세요' : '채널과 경로를 골라 주세요'}
          </button>
        </div>
      </form>
    </div>
  )
}
