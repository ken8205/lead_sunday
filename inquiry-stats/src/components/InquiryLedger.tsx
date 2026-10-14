import { useEffect, useMemo, useState } from 'react'
import type { Inquiry, Stage } from '../inquiries'
import { STAGES, STAGE_LABEL, localDate } from '../inquiries'
import type { InquiriesApi } from '../store/useInquiries'
import { addMonths, won } from '../lib/stats'
import { sampleData } from '../lib/sample'
import { InquiryDialog } from './InquiryDialog'
import { ConfirmButton } from './ConfirmButton'

interface Props {
  api: InquiriesApi
  staffSuggestions?: string[]
  canDelete: boolean
}

const weekday = (d: string) => '일월화수목금토'[new Date(`${d}T00:00:00`).getDay()]

// 상담 대장: 카카오톡·LINE·전화·플랫폼 등 어디로 들어온 문의든 한 장씩 적고, 진행되면 단계를 눌러 올린다.
export function InquiryLedger({ api, staffSuggestions, canDelete }: Props) {
  const today = localDate()
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [editing, setEditing] = useState<Inquiry | 'new' | null>(null)
  const [cheer, setCheer] = useState<string | null>(null)
  const rows = api.inquiries.filter((i) => i.date.startsWith(month))
  const campaigns = useMemo(() => [...new Set(api.inquiries.map((i) => i.campaign).filter(Boolean))], [api.inquiries])

  const todayCount = api.inquiries.filter((i) => i.date === today).length
  const monthPaid = rows.filter((i) => i.stage === 'paid')

  useEffect(() => {
    if (!cheer) return
    const t = setTimeout(() => setCheer(null), 2600)
    return () => clearTimeout(t)
  }, [cheer])

  // 결제로 바뀌면 축하 한 번
  const celebrate = (paidCount: number) => setCheer(`결제 기록 완료! 이번 달 ${paidCount}번째 결제예요`)

  const setStage = (i: Inquiry, stage: Stage) => {
    if (stage === i.stage) return
    const paidDate = stage === 'paid' ? (i.paidDate ?? today) : null
    api.update(i.id, { stage, paidDate, ...(stage === 'paid' ? {} : { amount: null }) })
    if (stage === 'paid') {
      if (i.amount == null) setEditing({ ...i, stage, paidDate }) // 금액을 바로 입력
      celebrate(monthPaid.length + 1)
    }
  }

  return (
    <div className="ledger">
      <section className="hero-row">
        <button className="add-big" onClick={() => setEditing('new')}>
          <span className="plus">+</span>
          <span>
            <b>새 문의 기록</b>
            <small>창구, 경로 누르고 저장하면 끝</small>
          </span>
        </button>
        <div className="today-card">
          <span className="help">오늘 기록</span>
          <b>{todayCount}건</b>
        </div>
      </section>

      {api.replaceAll && (
        <div className="demo-bar">
          <span>이 브라우저에만 저장되는 시험 모드입니다. 예시 데이터는 가상의 문의이며 실제 환자가 아닙니다.</span>
          <button className="btn btn-small" onClick={() => api.replaceAll!(sampleData())}>
            예시 채우기
          </button>
          <ConfirmButton label="모두 비우기" confirmLabel="정말 비우기" className="btn-small" onConfirm={() => api.replaceAll!({ inquiries: [], adCosts: [] })} />
        </div>
      )}

      <section className="panel">
        <div className="month-nav">
          <button className="btn btn-small" aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>
            ◀
          </button>
          <input id="ledger-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn btn-small" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
            ▶
          </button>
          <span className="month-sum">
            문의 <b>{rows.length}</b> · 결제 <b>{monthPaid.length}</b>
            {monthPaid.length > 0 && <> · {won(monthPaid.reduce((s, i) => s + (i.amount ?? 0), 0))}</>}
          </span>
        </div>

        {rows.length === 0 ? (
          <p className="empty-all">이 달의 문의가 없습니다. 위의 "새 문의 기록"으로 첫 문의를 남겨 보세요.</p>
        ) : (
          <ul className="cards">
            {rows.map((i) => (
              <li key={i.id} className={`icard icard-${i.stage}`}>
                <div className="icard-top">
                  <span className="icard-date">
                    {Number(i.date.slice(5, 7))}/{Number(i.date.slice(8))} <small>{weekday(i.date)}</small>
                  </span>
                  <span className="icard-main">
                    <b>{i.source || '경로 미입력'}</b>
                    <span className="sub">
                      {[i.channel, i.nationality, i.interest].filter(Boolean).join(' · ')}
                      {i.campaign && ` · ${i.campaign}`}
                    </span>
                  </span>
                  {i.stage === 'paid' && i.amount != null && <span className="icard-amount">{won(i.amount)}</span>}
                </div>
                <div className="icard-bottom">
                  <div className="stepper stepper-small" role="group" aria-label="단계">
                    {STAGES.map((s) => (
                      <button key={s} className={`step step-${s}${i.stage === s ? ' on' : ''}${STAGES.indexOf(s) < STAGES.indexOf(i.stage) ? ' done' : ''}`} aria-pressed={i.stage === s} onClick={() => setStage(i, s)}>
                        {STAGE_LABEL[s]}
                      </button>
                    ))}
                  </div>
                  <span className="icard-meta">
                    {i.note && <span className="sub">{i.note}</span>}
                    {i.staff && <span className="sub">{i.staff}</span>}
                    <button className="btn btn-small" onClick={() => setEditing(i)}>
                      수정
                    </button>
                    {canDelete && <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => api.remove(i.id)} />}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {cheer && (
        <div className="cheer" role="status">
          <span className="burst" aria-hidden="true">
            {Array.from({ length: 10 }, (_, k) => (
              <i key={k} style={{ ['--a' as string]: `${k * 36}deg` }} />
            ))}
          </span>
          {cheer}
        </div>
      )}

      {editing && (
        <InquiryDialog
          initial={editing === 'new' ? undefined : editing}
          staffSuggestions={staffSuggestions}
          campaignSuggestions={campaigns}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            const wasPaid = editing !== 'new' && api.inquiries.find((x) => x.id === editing.id)?.stage === 'paid'
            if (editing === 'new') {
              api.add(v)
              setMonth(v.date.slice(0, 7))
            } else api.update(editing.id, v)
            if (v.stage === 'paid' && !wasPaid) celebrate(api.inquiries.filter((x) => x.date.startsWith(v.date.slice(0, 7)) && x.stage === 'paid').length + 1)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
