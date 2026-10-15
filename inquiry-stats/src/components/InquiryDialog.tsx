import { useState } from 'react'
import type { Inquiry, NewInquiry, Stage } from '../inquiries'
import type { OptionKind, OptionLists } from '../inquiries'
import { DEPOSIT_RATE, STAGES, STAGE_LABEL, localDate, stageFieldsFor } from '../inquiries'

interface Props {
  initial?: Inquiry // 있으면 수정
  staffSuggestions?: string[]
  campaignSuggestions: string[]
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
    depositAmount: initial?.depositAmount ?? null,
    depositDate: initial?.depositDate ?? null,
    paidDate: initial?.paidDate ?? null,
    bookedDate: initial?.bookedDate ?? null,
    consultAt: initial?.consultAt ?? null,
    visitedDate: initial?.visitedDate ?? null,
    surgeryDate: initial?.surgeryDate ?? null,
    canceledDate: initial?.canceledDate ?? null,
    refundAmount: initial?.refundAmount ?? null,
    note: initial?.note ?? '',
    staff: initial?.staff ?? '',
  }))
  const [depositTouched, setDepositTouched] = useState(initial?.depositAmount != null)
  const [more, setMore] = useState(() => !!(initial && (initial.campaign || initial.note || initial.staff || initial.date !== today)))
  const set = <K extends keyof NewInquiry>(k: K, v: NewInquiry[K]) => setF((x) => ({ ...x, [k]: v }))
  const money = f.stage === 'reserved' || f.stage === 'paid' || f.stage === 'canceled'
  const split = f.stage !== 'paid' || f.depositAmount != null // 예약금을 먼저 받았는지 (결제 완료일 때만 고를 수 있음)
  const tenPct = (total: number | null) => (total ? Math.round(total * DEPOSIT_RATE) : null)
  const valid = f.date !== '' && f.channel !== '' && f.source !== '' && (!money || (f.amount ?? 0) > 0)

  const setStage = (stage: Stage) =>
    setF((x) => {
      const keepDeposit = stage === 'reserved' || stage === 'canceled' || (stage === 'paid' && x.depositAmount != null)
      return { ...x, stage, depositAmount: keepDeposit ? (x.depositAmount ?? tenPct(x.amount)) : x.depositAmount }
    })
  const setTotal = (total: number | null) =>
    setF((x) => ({ ...x, amount: total, depositAmount: !depositTouched && (x.stage !== 'paid' || x.depositAmount != null) ? tenPct(total) : x.depositAmount }))
  const balance = Math.max(0, (f.amount ?? 0) - (f.depositAmount ?? 0))
  const refundMode = f.refundAmount == null || f.refundAmount === (f.depositAmount ?? 0) ? 'full' : f.refundAmount === 0 ? 'none' : 'part'

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="dialog sheet"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          const dep = money && split ? f.depositAmount : null
          const filled = {
            ...f,
            depositAmount: dep,
            depositDate: dep ? (f.depositDate ?? today) : null,
            paidDate: f.paidDate ?? today,
            canceledDate: f.canceledDate ?? today,
            refundAmount: f.refundAmount ?? dep ?? 0,
          }
          onSubmit({ ...filled, ...stageFieldsFor(f.stage, filled, today), campaign: f.campaign.trim(), note: f.note.trim(), staff: f.staff.trim() })
        }}
      >
        <div className="sheet-head">
          <h2>{initial ? '문의 수정' : '새 문의'}</h2>
          <span className="help">{f.date === today ? '오늘' : f.date}</span>
        </div>

        <label className="who">
          이니셜·구분 <small>(선택 · 나중에 이 카드를 찾을 때 씁니다)</small>
          <input id="inq-note" maxLength={100} value={f.note} placeholder="예: K.H. 50대 여" onChange={(e) => set('note', e.target.value)} />
        </label>

        <Chips label="문의 채널" value={f.channel} options={options.channel} onChange={(v) => set('channel', v)} onAdd={onAddOption && ((n) => onAddOption('channel', n))} required />
        <Chips label="유입 경로" value={f.source} options={options.source} onChange={(v) => set('source', v)} onAdd={onAddOption && ((n) => onAddOption('source', n))} required />
        <Chips label="국적" value={f.nationality} options={options.nationality} onChange={(v) => set('nationality', v)} onAdd={onAddOption && ((n) => onAddOption('nationality', n))} />
        <Chips label="관심 시술" value={f.interest} options={options.interest} onChange={(v) => set('interest', v)} onAdd={onAddOption && ((n) => onAddOption('interest', n))} />

        <fieldset className="chips">
          <legend>단계</legend>
          <div className="stepper">
            {[...STAGES, 'canceled' as Stage].map((s) => (
              <button type="button" key={s} className={`step step-${s}${f.stage === s ? ' on' : ''}`} aria-pressed={f.stage === s} onClick={() => setStage(s)}>
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
            {f.stage === 'paid' && (
              <div className="stepper">
                <button type="button" className={`pick${!split ? ' on' : ''}`} onClick={() => setF((x) => ({ ...x, depositAmount: null, depositDate: null }))}>
                  당일 전액 결제
                </button>
                <button type="button" className={`pick${split ? ' on' : ''}`} onClick={() => setF((x) => ({ ...x, depositAmount: x.depositAmount ?? tenPct(x.amount) }))}>
                  예약금 + 잔금
                </button>
              </div>
            )}
            <div className="form-grid">
              <label>
                총액 (만원)
                <input id="inq-amount" type="number" inputMode="numeric" min={0} autoFocus value={f.amount ?? ''} onChange={(e) => setTotal(numOrNull(e.target.value))} />
              </label>
              {split && (
                <>
                  <label>
                    예약금 (만원) <small>기본 10%</small>
                    <input
                      id="inq-deposit"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={f.depositAmount ?? ''}
                      onChange={(e) => {
                        setDepositTouched(true)
                        set('depositAmount', numOrNull(e.target.value))
                      }}
                    />
                  </label>
                  <label>
                    예약금 받은 날
                    <input id="inq-deposit-date" type="date" value={f.depositDate ?? today} min={f.date} max={today} onChange={(e) => set('depositDate', e.target.value || null)} />
                  </label>
                </>
              )}
              {f.stage === 'paid' && (
                <label>
                  {split ? `잔금 ${balance.toLocaleString('ko-KR')}만원 받은 날` : '결제일'}
                  <input id="inq-paid" type="date" value={f.paidDate ?? today} min={f.depositDate ?? f.date} max={today} onChange={(e) => set('paidDate', e.target.value || null)} />
                </label>
              )}
              {f.stage === 'canceled' && (
                <label>
                  취소한 날
                  <input id="inq-cancel-date" type="date" value={f.canceledDate ?? today} min={f.depositDate ?? f.date} max={today} onChange={(e) => set('canceledDate', e.target.value || null)} />
                </label>
              )}
            </div>
            {(f.stage === 'reserved' || (f.stage === 'paid' && split)) && (
              <label className="surgery-date">
                수술 {f.stage === 'reserved' ? '예정일' : '날'}
                <input id="inq-surgery" type="date" value={f.surgeryDate ?? ''} min={f.date} onChange={(e) => set('surgeryDate', e.target.value || null)} />
              </label>
            )}
            {f.stage === 'reserved' && <p className="help pay-note">잔금 {balance.toLocaleString('ko-KR')}만원은 수술 당일 받으면 카드의 "잔금 받기"를 누르세요.</p>}
            {f.stage === 'canceled' && (
              <div className="refund">
                <span className="help">예약금 {(f.depositAmount ?? 0).toLocaleString('ko-KR')}만원 환불</span>
                <div className="stepper">
                  <button type="button" className={`pick${refundMode === 'full' ? ' on' : ''}`} onClick={() => set('refundAmount', f.depositAmount ?? 0)}>
                    전액 환불
                  </button>
                  <button type="button" className={`pick${refundMode === 'part' ? ' on' : ''}`} onClick={() => set('refundAmount', Math.round((f.depositAmount ?? 0) / 2))}>
                    일부 환불
                  </button>
                  <button type="button" className={`pick${refundMode === 'none' ? ' on' : ''}`} onClick={() => set('refundAmount', 0)}>
                    환불 없음
                  </button>
                </div>
                {refundMode === 'part' && (
                  <label className="refund-amount">
                    환불액 (만원)
                    <input id="inq-refund" type="number" inputMode="numeric" min={0} max={f.depositAmount ?? undefined} value={f.refundAmount ?? ''} onChange={(e) => set('refundAmount', numOrNull(e.target.value))} />
                  </label>
                )}
              </div>
            )}
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
            <p className="help wide">이름·연락처·생년월일은 적지 마세요. 통계용으로 오래 보관하는 대장입니다.</p>
          </div>
        ) : (
          <button type="button" className="linkish" onClick={() => setMore(true)}>
            + 문의일·단계 날짜·광고 이름·담당자
          </button>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary btn-big" disabled={!valid}>
            {valid ? '저장' : money && !(f.amount ?? 0) ? '총액을 입력해 주세요' : '채널과 경로를 골라 주세요'}
          </button>
        </div>
      </form>
    </div>
  )
}
