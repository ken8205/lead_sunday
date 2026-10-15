import { useMemo, useState } from 'react'
import type { Inquiry, NewInquiry, Stage } from '../inquiries'
import { CHANNELS, INTERESTS, NATIONALITIES, SOURCES, STAGES, STAGE_LABEL, localDate } from '../inquiries'

interface Props {
  initial?: Inquiry // 있으면 수정
  staffSuggestions?: string[]
  campaignSuggestions: string[]
  recent: Inquiry[] // 최근 문의 (자주 쓰는 버튼을 앞에 보이기 위해)
  onSubmit: (i: NewInquiry) => void
  onClose: () => void
}

// 드롭다운 대신 눌러서 고르는 버튼 묶음. 같은 버튼을 다시 누르면 선택이 풀린다.
// 최근 많이 쓴 것 limit개만 먼저 보이고, 나머지는 "더보기"로 펼친다.
function Chips({ label, value, options, onChange, required, counts, limit }: { label: string; value: string; options: string[]; onChange: (v: string) => void; required?: boolean; counts: Map<string, number>; limit: number }) {
  const [open, setOpen] = useState(false)
  const all = value && !options.includes(value) ? [value, ...options] : options // 예전 값이 목록에서 빠졌어도 보이게
  const ranked = [...all].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0)) // 같은 횟수면 원래 순서 유지
  const top = ranked.slice(0, limit)
  if (value && !top.includes(value)) top.push(value) // 고른 것은 항상 보이게
  const shown = open ? ranked : top
  const hidden = ranked.length - top.length
  return (
    <fieldset className="chips">
      <legend>
        {label}
        {required && !value && <span className="need"> · 골라 주세요</span>}
      </legend>
      <div className="chip-row">
        {shown.map((o) => (
          <button type="button" key={o} className={`pick${value === o ? ' on' : ''}`} aria-pressed={value === o} onClick={() => onChange(value === o ? '' : o)}>
            {o}
          </button>
        ))}
        {hidden > 0 && (
          <button type="button" className="pick pick-more" aria-expanded={open} onClick={() => setOpen(!open)}>
            {open ? '접기' : `+${hidden}개 더`}
          </button>
        )}
      </div>
    </fieldset>
  )
}

// 최근 90일 동안 항목별로 몇 번 골랐는지
function useCounts(recent: Inquiry[], key: 'channel' | 'source' | 'nationality' | 'interest') {
  return useMemo(() => {
    const m = new Map<string, number>()
    for (const i of recent) if (i[key]) m.set(i[key], (m.get(i[key]) ?? 0) + 1)
    return m
  }, [recent, key])
}

export function InquiryDialog({ initial, staffSuggestions = [], campaignSuggestions, recent, onSubmit, onClose }: Props) {
  const today = localDate()
  const counts = { channel: useCounts(recent, 'channel'), source: useCounts(recent, 'source'), nationality: useCounts(recent, 'nationality'), interest: useCounts(recent, 'interest') }
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

        <Chips label="어디로 문의했나요?" value={f.channel} options={CHANNELS} onChange={(v) => set('channel', v)} counts={counts.channel} limit={6} required />
        <Chips label="어떻게 알고 왔나요?" value={f.source} options={SOURCES} onChange={(v) => set('source', v)} counts={counts.source} limit={6} required />
        <Chips label="국적" value={f.nationality} options={NATIONALITIES} onChange={(v) => set('nationality', v)} counts={counts.nationality} limit={4} />
        <Chips label="관심 시술" value={f.interest} options={INTERESTS} onChange={(v) => set('interest', v)} counts={counts.interest} limit={6} />

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
            {valid ? '저장' : '창구와 경로를 골라 주세요'}
          </button>
        </div>
      </form>
    </div>
  )
}
