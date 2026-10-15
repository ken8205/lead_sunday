import { useEffect, useState } from 'react'
import type { Entry, Kind, NewEntry } from '../inquiries'
import { KINDS, KIND_LABEL, WALK_IN, localDate } from '../inquiries'
import type { EntriesApi } from '../store/useEntries'
import { won } from '../lib/stats'
import { sampleData } from '../lib/sample'
import { EntrySheet } from './EntrySheet'
import { ConfirmButton } from './ConfirmButton'

const shiftDay = (d: string, n: number) => localDate(new Date(new Date(`${d}T00:00:00`).getTime() + n * 86400000))
const dayTitle = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 (${'일월화수목금토'[new Date(`${d}T00:00:00`).getDay()]})`
const NEXT: Partial<Record<Kind, Kind>> = { inquiry: 'consult', consult: 'treatment' } // 이어서 적을 카드

interface Sheet {
  kind: Kind
  initial?: Entry
  prefill?: Partial<NewEntry>
}

// 오늘 기록: 문의·상담·시술 카드를 그날 적는다.
export function TodayPage({ api }: { api: EntriesApi }) {
  const today = localDate()
  const [day, setDay] = useState(today)
  const [sheet, setSheet] = useState<Sheet | null>(null)
  const [cheer, setCheer] = useState<string | null>(null)
  const list = api.entries.filter((e) => e.date === day)
  const count = (k: Kind) => list.filter((e) => e.kind === k).length
  const revenue = list.reduce((s, e) => s + (e.kind === 'treatment' ? (e.amount ?? 0) : 0), 0)

  useEffect(() => {
    if (!cheer) return
    const t = setTimeout(() => setCheer(null), 2400)
    return () => clearTimeout(t)
  }, [cheer])

  return (
    <div className="today">
      <section className="panel day-panel">
        <div className="day-nav">
          <button className="btn btn-small" aria-label="전날" onClick={() => setDay(shiftDay(day, -1))}>
            ◀
          </button>
          <h2>
            {day === today ? '오늘 ' : ''}
            {dayTitle(day)}
          </h2>
          <button className="btn btn-small" aria-label="다음날" disabled={day >= today} onClick={() => setDay(shiftDay(day, 1))}>
            ▶
          </button>
          {day !== today && (
            <button className="btn btn-small" onClick={() => setDay(today)}>
              오늘로
            </button>
          )}
        </div>
        <div className="counters">
          {KINDS.map((k) => (
            <button key={k} className={`counter counter-${k}`} onClick={() => setSheet({ kind: k })}>
              <span className="counter-label">{KIND_LABEL[k]}</span>
              <b>{count(k)}</b>
              <span className="counter-add">+ {KIND_LABEL[k]} 기록</span>
            </button>
          ))}
        </div>
        <p className="day-revenue">
          {day === today ? '오늘' : '이날'} 매출 <b>{won(revenue)}</b> <small>(시술 총액 합)</small>
        </p>
      </section>

      {api.replaceAll && (
        <div className="demo-bar">
          <span>이 브라우저에만 저장되는 시험 모드입니다. 예시 데이터는 가상의 기록이며 실제 환자가 아닙니다.</span>
          <button className="btn btn-small" onClick={() => api.replaceAll!(sampleData())}>
            예시 채우기
          </button>
          <ConfirmButton label="모두 비우기" confirmLabel="정말 비우기" className="btn-small" onConfirm={() => api.replaceAll!({ entries: [], adCosts: [] })} />
        </div>
      )}

      <section className="panel">
        <h2>{day === today ? '오늘' : '이날'} 적은 카드</h2>
        {list.length === 0 ? (
          <p className="empty-all">아직 없습니다. 위의 문의·상담·시술 버튼을 눌러 기록하세요.</p>
        ) : (
          <ul className="cards">
            {list.map((e) => {
              const next = e.kind === 'inquiry' && e.source === WALK_IN ? undefined : NEXT[e.kind] // 워크인 문의는 상담 카드와 함께 이미 만들어졌다
              return (
                <li key={e.id} className={`ecard ecard-${e.kind}`}>
                  <span className={`kind-badge kind-${e.kind}`}>{KIND_LABEL[e.kind]}</span>
                  <span className="ecard-main">
                    <b>
                      {e.patientName && <span className="ecard-who">{e.patientName}</span>}
                      {e.source}
                    </b>
                    <span className="sub">{[e.channel, e.nationality, e.interest, e.note].filter(Boolean).join(' · ')}</span>
                  </span>
                  {e.kind === 'treatment' && <span className="ecard-amount">{won(e.amount ?? 0)}</span>}
                  <span className="ecard-actions">
                    {next && (
                      <button
                        className={`btn btn-small btn-next btn-next-${next}`}
                        onClick={() => setSheet({ kind: next, prefill: { source: e.source, nationality: e.nationality, interest: e.interest, patientName: e.patientName } })}
                      >
                        → {KIND_LABEL[next]}
                      </button>
                    )}
                    <button className="btn btn-small" onClick={() => setSheet({ kind: e.kind, initial: e })}>
                      수정
                    </button>
                    <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => api.remove(e.id)} />
                  </span>
                </li>
              )
            })}
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

      {sheet && (
        <EntrySheet
          kind={sheet.kind}
          date={day}
          initial={sheet.initial}
          prefill={sheet.prefill}
          options={api.options}
          onAddOption={(kind, name) => api.setOptions(kind, [...api.options[kind], name])}
          onClose={() => setSheet(null)}
          onSubmit={(entries) => {
            if (sheet.initial) api.update(sheet.initial.id, entries[0])
            else {
              api.add(entries)
              const t = entries.find((x) => x.kind === 'treatment')
              setCheer(t ? `시술 기록! ${won(t.amount ?? 0)}` : `${entries.map((x) => KIND_LABEL[x.kind]).join(' + ')} 1건 기록`)
            }
            setDay(entries[0].date)
            setSheet(null)
          }}
        />
      )}
    </div>
  )
}
