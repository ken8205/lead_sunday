import { useState } from 'react'
import type { Inquiry, NewInquiry, Stage } from '../inquiries'
import { CHANNELS, INTERESTS, NATIONALITIES, SOURCES, STAGES, STAGE_LABEL, localDate } from '../inquiries'

interface Props {
  initial?: Inquiry // 있으면 수정
  staffSuggestions?: string[]
  campaignSuggestions: string[]
  onSubmit: (i: NewInquiry) => void
  onClose: () => void
}

function Pick({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label>
      {label}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">선택</option>
        {/* 예전에 쓰던 값이 목록에서 빠졌어도 그대로 보이게 */}
        {value && !options.includes(value) && <option value={value}>{value}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function InquiryDialog({ initial, staffSuggestions = [], campaignSuggestions, onSubmit, onClose }: Props) {
  const [f, setF] = useState<NewInquiry>(() => ({
    date: initial?.date ?? localDate(),
    channel: initial?.channel ?? '',
    source: initial?.source ?? '',
    campaign: initial?.campaign ?? '',
    nationality: initial?.nationality ?? '한국',
    interest: initial?.interest ?? '',
    stage: initial?.stage ?? 'inquiry',
    amount: initial?.amount ?? null,
    note: initial?.note ?? '',
    staff: initial?.staff ?? '',
  }))
  const set = <K extends keyof NewInquiry>(k: K, v: NewInquiry[K]) => setF((x) => ({ ...x, [k]: v }))
  const valid = f.date !== '' && f.channel !== '' && f.source !== ''

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="dialog dialog-wide"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onSubmit({ ...f, campaign: f.campaign.trim(), note: f.note.trim(), staff: f.staff.trim(), amount: f.stage === 'paid' ? f.amount : null })
        }}
      >
        <h2>{initial ? '문의 수정' : '문의 추가'}</h2>
        <div className="form-grid">
          <label>
            문의일
            <input type="date" value={f.date} max={localDate()} onChange={(e) => set('date', e.target.value)} />
          </label>
          <Pick label="문의 창구 *" value={f.channel} options={CHANNELS} onChange={(v) => set('channel', v)} />
          <Pick label="알게 된 경로 *" value={f.source} options={SOURCES} onChange={(v) => set('source', v)} />
          <label>
            광고·이벤트 이름 (선택)
            <input list="campaign-list" value={f.campaign} placeholder="예: 10월 인스타 실리프팅" onChange={(e) => set('campaign', e.target.value)} />
            <datalist id="campaign-list">
              {campaignSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <Pick label="국적" value={f.nationality} options={NATIONALITIES} onChange={(v) => set('nationality', v)} />
          <Pick label="관심 시술" value={f.interest} options={INTERESTS} onChange={(v) => set('interest', v)} />
          <label>
            단계
            <select value={f.stage} onChange={(e) => set('stage', e.target.value as Stage)}>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          {f.stage === 'paid' && (
            <label>
              결제 금액 (만원)
              <input type="number" inputMode="numeric" min={0} value={f.amount ?? ''} onChange={(e) => set('amount', e.target.value === '' ? null : Math.max(0, Math.round(Number(e.target.value))))} />
            </label>
          )}
          <label>
            담당자
            <input list="inq-staff-list" value={f.staff} onChange={(e) => set('staff', e.target.value)} />
            <datalist id="inq-staff-list">
              {staffSuggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </label>
          <label>
            메모 (이니셜 정도만)
            <input maxLength={100} value={f.note} placeholder="예: K.H. / 재문의" onChange={(e) => set('note', e.target.value)} />
          </label>
        </div>
        <p className="help">이름·연락처·생년월일은 적지 마세요. 통계용으로 오래 보관하는 대장입니다.</p>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            저장
          </button>
        </div>
      </form>
    </div>
  )
}
