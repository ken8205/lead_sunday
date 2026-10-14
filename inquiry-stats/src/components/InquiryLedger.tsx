import { useMemo, useState } from 'react'
import type { Inquiry, Stage } from '../inquiries'
import { STAGES, STAGE_LABEL, localDate } from '../inquiries'
import type { InquiriesApi } from '../store/useInquiries'
import { addMonths } from '../lib/stats'
import { InquiryDialog } from './InquiryDialog'
import { ConfirmButton } from './ConfirmButton'

interface Props {
  api: InquiriesApi
  staffSuggestions?: string[]
  canDelete: boolean
}

// 상담 대장: 카카오톡·LINE·전화·플랫폼 등 어디로 들어온 문의든 한 줄씩 적고, 진행되면 단계를 올린다.
export function InquiryLedger({ api, staffSuggestions, canDelete }: Props) {
  const [month, setMonth] = useState(() => localDate().slice(0, 7))
  const [editing, setEditing] = useState<Inquiry | 'new' | null>(null)
  const rows = api.inquiries.filter((i) => i.date.startsWith(month))
  const campaigns = useMemo(() => [...new Set(api.inquiries.map((i) => i.campaign).filter(Boolean))], [api.inquiries])

  return (
    <div className="ledger">
      <section className="panel">
        <div className="panel-head">
          <h2>상담 대장</h2>
          <button className="btn btn-primary" onClick={() => setEditing('new')}>
            + 문의 추가
          </button>
        </div>
        <p className="help">문의가 들어오면 창구와 알게 된 경로를 적고, 예약·내원·결제로 진행되면 단계를 바꿔 주세요. 통계는 문의일이 속한 달로 묶입니다.</p>
        <div className="month-nav">
          <button className="btn btn-small" onClick={() => setMonth(addMonths(month, -1))}>
            ◀
          </button>
          <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
          <button className="btn btn-small" onClick={() => setMonth(addMonths(month, 1))}>
            ▶
          </button>
          <span className="help">{rows.length}건</span>
        </div>

        {rows.length === 0 ? (
          <p className="empty-all">이 달의 문의가 없습니다.</p>
        ) : (
          <div className="table-wrap">
            <table className="data">
              <thead>
                <tr>
                  <th>문의일</th>
                  <th>창구</th>
                  <th>경로</th>
                  <th>국적</th>
                  <th>관심 시술</th>
                  <th>단계</th>
                  <th className="num">금액</th>
                  <th>메모</th>
                  <th>담당</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id}>
                    <td className="num">{i.date.slice(5)}</td>
                    <td>{i.channel}</td>
                    <td>
                      {i.source}
                      {i.campaign && <small className="sub"> · {i.campaign}</small>}
                    </td>
                    <td>{i.nationality}</td>
                    <td>{i.interest}</td>
                    <td>
                      <select
                        aria-label="단계"
                        className={`stage stage-${i.stage}`}
                        value={i.stage}
                        onChange={(e) => {
                          const stage = e.target.value as Stage
                          const paidDate = stage === 'paid' ? (i.paidDate ?? localDate()) : null
                          api.update(i.id, { stage, paidDate, ...(stage === 'paid' ? {} : { amount: null }) })
                          if (stage === 'paid' && i.amount == null) setEditing({ ...i, stage, paidDate }) // 결제면 금액을 바로 입력
                        }}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="num">{i.amount != null ? i.amount.toLocaleString('ko-KR') : ''}</td>
                    <td>{i.note}</td>
                    <td>{i.staff}</td>
                    <td className="row-actions">
                      <button className="btn btn-small" onClick={() => setEditing(i)}>
                        수정
                      </button>
                      {canDelete && <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => api.remove(i.id)} />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <InquiryDialog
          initial={editing === 'new' ? undefined : editing}
          staffSuggestions={staffSuggestions}
          campaignSuggestions={campaigns}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            if (editing === 'new') {
              api.add(v)
              setMonth(v.date.slice(0, 7))
            } else api.update(editing.id, v)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
