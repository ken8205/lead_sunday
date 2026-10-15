import { useEffect, useState } from 'react'
import type { Kind } from '../inquiries'
import { KINDS, KIND_LABEL, localDate } from '../inquiries'
import type { EntriesApi } from '../store/useEntries'
import { won } from '../lib/stats'
import { sampleData } from '../lib/sample'
import { EntrySheet } from './EntrySheet'
import { ConfirmButton } from './ConfirmButton'

const dayTitle = (d: string) => `${Number(d.slice(5, 7))}월 ${Number(d.slice(8))}일 (${'일월화수목금토'[new Date(`${d}T00:00:00`).getDay()]})`

interface Sheet {
  kind: Kind
}

// 오늘 기록: 문의·상담·시술을 그날 당일 적는다. 지난날은 보지도 고치지도 않는다 (오늘 것만 지울 수 있다).
export function TodayPage({ api }: { api: EntriesApi }) {
  const today = localDate()
  const day = today // 그날 당일만 기록한다
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
        <h2 className="day-head">오늘 {dayTitle(day)}</h2>
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
          오늘 매출 <b>{won(revenue)}</b> <small>(시술 총액 합)</small>
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
        <h2>오늘 적은 기록</h2>
        <p className="help">잘못 적은 기록은 여기서 지우세요. 내일이 되면 이 목록은 비고, 통계에만 남습니다.</p>
        {list.length === 0 ? (
          <p className="empty-all">아직 없습니다. 위의 문의·상담·시술 버튼을 눌러 기록하세요.</p>
        ) : (
          <ul className="cards">
            {list.map((e) => (
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
                    <ConfirmButton label="삭제" confirmLabel="정말 삭제" className="btn-small btn-danger" onConfirm={() => api.remove(e.id)} />
                  </span>
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

      {sheet && (
        <EntrySheet
          kind={sheet.kind}
          date={day}
          options={api.options}
          onAddOption={(kind, name) => api.setOptions(kind, [...api.options[kind], name])}
          onClose={() => setSheet(null)}
          onSubmit={(entries) => {
            api.add(entries)
            const t = entries.find((x) => x.kind === 'treatment')
            setCheer(t ? `시술 기록! ${won(t.amount ?? 0)}` : `${entries.map((x) => KIND_LABEL[x.kind]).join(' + ')} 1건 기록`)
            setSheet(null)
          }}
        />
      )}
    </div>
  )
}
