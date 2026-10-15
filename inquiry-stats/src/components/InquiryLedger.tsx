import { useEffect, useState } from 'react'
import type { Inquiry, Stage } from '../inquiries'
import { STAGES, STAGE_LABEL, localDate, searchText, shortAt, stageFieldsFor } from '../inquiries'
import type { InquiriesApi } from '../store/useInquiries'
import { addMonths, won } from '../lib/stats'
import { sampleData } from '../lib/sample'
import { InquiryDialog } from './InquiryDialog'
import { ConfirmButton } from './ConfirmButton'

interface Props {
  api: InquiriesApi
  canDelete: boolean
  canEditOptions: boolean
}

const weekday = (d: string) => '일월화수목금토'[new Date(`${d}T00:00:00`).getDay()]
const md = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : '')
const daysAgo = (today: string, n: number) => localDate(new Date(new Date(`${today}T00:00:00`).getTime() - n * 86400000))
type ListMode = 'active' | 'month'

// 카드의 날짜 줄: 지금 단계에서 중요한 날짜 (오늘이면 강조)
function DateLine({ i, today }: { i: Inquiry; today: string }) {
  const parts: [string, string | null][] = [
    ['상담 예정', i.stage === 'booked' ? i.consultAt : null],
    ['상담', i.stage !== 'booked' ? i.visitedDate : null],
    ['수술 예정', i.stage === 'reserved' ? i.surgeryDate : null],
    ['결제 완료', i.stage === 'paid' ? i.paidDate : null],
  ]
  const shown = parts.filter(([, d]) => d)
  if (!shown.length) return null
  return (
    <p className="icard-dates">
      {shown.map(([label, d]) => (
        <span key={label} className={d!.slice(0, 10) === today ? 'is-today' : undefined}>
          {label} {d!.slice(0, 10) === today ? `오늘${d!.length > 10 ? ' ' + d!.slice(11, 16) : ''}` : i.stage === 'booked' ? shortAt(d) : md(d)}
        </span>
      ))}
    </p>
  )
}

// 진행 중 목록: 지금 챙겨야 할 카드만, 할 일 순서대로 묶는다
function activeGroups(all: Inquiry[], today: string): [string, Inquiry[]][] {
  const byAt = (a: string | null, b: string | null) => (a ?? '9999').localeCompare(b ?? '9999')
  const booked = all.filter((i) => i.stage === 'booked')
  const reserved = all.filter((i) => i.stage === 'reserved')
  const isToday = (d: string | null) => !!d && d.slice(0, 10) === today
  return [
    ['오늘 상담 예정', booked.filter((i) => isToday(i.consultAt)).sort((a, b) => byAt(a.consultAt, b.consultAt))],
    ['오늘 수술', reserved.filter((i) => isToday(i.surgeryDate))],
    ['최근 3일 문의 (아직 상담 예약 전)', all.filter((i) => i.stage === 'inquiry' && i.date >= daysAgo(today, 2))],
    // 예정일이 일주일 넘게 지난 예약(안 오신 분)은 빼고, 예정일이 없으면 예약한 지 30일 이내만
    ['상담 예약 (다른 날)', booked.filter((i) => !isToday(i.consultAt) && (i.consultAt ? i.consultAt.slice(0, 10) >= daysAgo(today, 7) : (i.bookedDate ?? i.date) >= daysAgo(today, 30))).sort((a, b) => byAt(a.consultAt, b.consultAt))],
    ['수술 예약 (수술 전)', reserved.filter((i) => !isToday(i.surgeryDate)).sort((a, b) => byAt(a.surgeryDate, b.surgeryDate))],
    ['상담 후 결정 대기 (최근 30일)', all.filter((i) => i.stage === 'visited' && (i.visitedDate ?? i.date) >= daysAgo(today, 30)).sort((a, b) => (b.visitedDate ?? '').localeCompare(a.visitedDate ?? ''))],
  ]
}

// 상담 대장: 카카오톡·LINE·전화·플랫폼 등 어디로 들어온 문의든 한 장씩 적고, 진행되면 단계를 눌러 올린다.
export function InquiryLedger({ api, canDelete, canEditOptions }: Props) {
  const today = localDate()
  const [month, setMonth] = useState(() => today.slice(0, 7))
  const [editing, setEditing] = useState<Inquiry | 'new' | null>(null)
  const [cheer, setCheer] = useState<string | null>(null)
  const [mode, setMode] = useState<ListMode>('active')
  const [q, setQ] = useState('')
  const rows = api.inquiries.filter((i) => i.date.startsWith(month))
  const query = q.trim().toLowerCase()
  const found = query ? api.inquiries.filter((i) => searchText(i).includes(query)) : []
  const groups = activeGroups(api.inquiries, today)
  const activeCount = groups.reduce((n, [, l]) => n + l.length, 0)

  const todayCount = api.inquiries.filter((i) => i.date === today).length
  const monthPaid = rows.filter((i) => i.stage === 'paid')

  useEffect(() => {
    if (!cheer) return
    const t = setTimeout(() => setCheer(null), 2600)
    return () => clearTimeout(t)
  }, [cheer])

  // 결제로 바뀌면 축하 한 번

  const setStage = (i: Inquiry, stage: Stage) => {
    if (stage === i.stage) return
    if (stage === 'paid' && i.stage === 'reserved' && i.amount) {
      // 수술 당일 완불: 총액은 수술 예약 때 정해져 있으니 오늘 날짜로 바로 결제 완료
      api.update(i.id, { stage: 'paid', ...stageFieldsFor('paid', { ...i, paidDate: today, surgeryDate: i.surgeryDate ?? today }, today) })
      setCheer(`결제 완료! ${won(i.amount)}`)
      return
    }
    if (stage === 'booked' || stage === 'reserved' || stage === 'paid' || stage === 'canceled') {
      setEditing({ ...i, stage }) // 상담 예정 일시나 총액을 입력하는 창을 띄운다
      return
    }
    // 문의만·내원 상담: 바로 바꾸고 오늘 날짜를 남긴다 (앞 단계로 되돌리면 뒤 단계 기록은 지운다)
    api.update(i.id, { stage, ...stageFieldsFor(stage, i, today) })
    if (stage === 'visited') setCheer('내원 상담 기록!')
  }



  // 함수로 그린다 (컴포넌트로 만들면 다시 그릴 때마다 새로 만들어져 '정말 삭제' 상태가 풀린다)
  const renderCard = (i: Inquiry) => (
      <li key={i.id} className={`icard icard-${i.stage}`}>
        <div className="icard-top">
          <span className="icard-date">
            {Number(i.date.slice(5, 7))}/{Number(i.date.slice(8))} <small>{weekday(i.date)}</small>
          </span>
          <span className="icard-main">
            <b>
              {(i.patientName || i.birthDate) && (
                <span className="icard-who">
                  {i.patientName}
                  {i.birthDate && <small> {i.birthDate.slice(2).replace(/-/g, '')}</small>}
                </span>
              )}
              {i.source || '경로 미입력'}
            </b>
            <span className="sub">
              {[i.channel, i.nationality, i.interest, i.note].filter(Boolean).join(' · ')}
            </span>
          </span>
          {i.stage === 'paid' && i.amount != null && <span className="icard-amount">{won(i.amount)}</span>}
          {(i.stage === 'reserved' || i.stage === 'canceled') && i.amount != null && <span className={`icard-amount icard-amount-${i.stage}`}>{won(i.amount)}</span>}
        </div>
        <DateLine i={i} today={today} />
        <div className="icard-bottom">
          <div className="stepper stepper-small" role="group" aria-label="단계">
            {(i.stage === 'canceled' ? [...STAGES, 'canceled' as Stage] : STAGES).map((s) => (
              <button key={s} className={`step step-${s}${i.stage === s ? ' on' : ''}${STAGES.indexOf(s) < STAGES.indexOf(i.stage) ? ' done' : ''}`} aria-pressed={i.stage === s} onClick={() => setStage(i, s)}>
                {STAGE_LABEL[s]}
              </button>
            ))}
          </div>
          <span className="icard-meta">
            {i.stage === 'reserved' && (
              <>
                <button className="btn btn-small btn-pay" onClick={() => setStage(i, 'paid')}>
                  결제 완료 (수술 당일)
                </button>
                <button className="btn btn-small" onClick={() => setStage(i, 'canceled')}>
                  예약 취소
                </button>
              </>
            )}
            <button className="btn btn-small" onClick={() => setEditing(i)}>
              수정
            </button>
            {canDelete && <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => api.remove(i.id)} />}
          </span>
        </div>
      </li>  )

  return (
    <div className="ledger">
      <section className="hero-row">
        <button className="add-big" onClick={() => setEditing('new')}>
          <span className="plus">+</span>
          <span>
            <b>새 문의 기록</b>
            <small>채널, 경로 누르고 저장하면 끝</small>
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
        <div className="list-head">
          <div className="tabs tabs-small" role="tablist">
            <button className={mode === 'active' ? 'on' : ''} onClick={() => setMode('active')}>
              진행 중 {activeCount}
            </button>
            <button className={mode === 'month' ? 'on' : ''} onClick={() => setMode('month')}>
              월별 전체
            </button>
          </div>
          <input id="ledger-search" type="search" className="search" placeholder="이름·생년월일·경로로 찾기" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {query ? (
          <>
            <p className="help">"{q.trim()}" 찾은 결과 {found.length}건 (모든 달)</p>
            <ul className="cards">{found.slice(0, 100).map((i) => renderCard(i))}</ul>
          </>
        ) : mode === 'active' ? (
          activeCount === 0 ? (
            <p className="empty-all">지금 챙길 카드가 없습니다. 상담 예약·수술 예약이 생기면 여기에 모입니다.</p>
          ) : (
            groups
              .filter(([, l]) => l.length > 0)
              .map(([title, l]) => (
                <div className="group" key={title}>
                  <h3>
                    {title} <span>{l.length}</span>
                  </h3>
                  <ul className="cards">{l.map((i) => renderCard(i))}</ul>
                </div>
              ))
          )
        ) : (
          <>
            <div className="month-nav">
              <button className="btn btn-small" aria-label="이전 달" onClick={() => setMonth(addMonths(month, -1))}>
                ◀
              </button>
              <input id="ledger-month" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              <button className="btn btn-small" aria-label="다음 달" onClick={() => setMonth(addMonths(month, 1))}>
                ▶
              </button>
              <span className="month-sum">
                문의 <b>{rows.length}</b> · 결제 완료 <b>{monthPaid.length}</b> · 결제 완료 매출 <b>{won(monthPaid.reduce((s, i) => s + (i.amount ?? 0), 0))}</b>
              </span>
            </div>
            {rows.length === 0 ? (
              <p className="empty-all">이 달의 문의가 없습니다.</p>
            ) : (
              <ul className="cards">{rows.map((i) => renderCard(i))}</ul>
            )}
          </>
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
          options={api.options}
          onAddOption={canEditOptions ? (kind, name) => api.setOptions(kind, [...api.options[kind], name]) : undefined}
          onClose={() => setEditing(null)}
          onSubmit={(v) => {
            const before = editing === 'new' ? undefined : api.inquiries.find((x) => x.id === editing.id)
            if (editing === 'new') {
              api.add(v)
              setMonth(v.date.slice(0, 7))
              setQ('')
            } else api.update(editing.id, v)
            if (v.stage !== before?.stage) {
              if (v.stage === 'paid') setCheer(`결제 완료! ${won(v.amount ?? 0)}`)
              if (v.stage === 'reserved') setCheer(`수술 예약 완료! ${won(v.amount ?? 0)}`)
            }
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
