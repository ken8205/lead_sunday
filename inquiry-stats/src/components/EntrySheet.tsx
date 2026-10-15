import { useState } from 'react'
import type { Entry, Kind, NewEntry, OptionKind, OptionLists } from '../inquiries'
import { KIND_LABEL, WALK_IN, localDate } from '../inquiries'
import { Chips } from './Chips'

interface Props {
  kind: Kind
  date: string // 기록할 날 (보통 오늘)
  initial?: Entry // 있으면 수정
  prefill?: Partial<NewEntry> // "→ 상담", "→ 시술"로 열 때 앞 카드의 경로·국적 등
  options: OptionLists
  onAddOption?: (kind: OptionKind, name: string) => void
  onSubmit: (entries: NewEntry[]) => void // 워크인 상담이면 문의 카드도 같이 넘긴다
  onClose: () => void
}

const numOrNull = (v: string) => (v === '' ? null : Math.max(0, Math.round(Number(v))))

const HELP: Record<Kind, string> = {
  inquiry: '처음 연락 온 날 한 번만. 누구인지는 적지 않습니다.',
  consult: '병원에서 상담한 날 한 장 (재상담도 한 장).',
  treatment: '수술·시술한 날 한 장. 총액이 그날 매출입니다. 같은 날 여러 시술이면 한 장에 합쳐서, 패키지는 첫 회에만 총액을 적습니다.',
}

export function EntrySheet({ kind, date, initial, prefill, options, onAddOption, onSubmit, onClose }: Props) {
  const [f, setF] = useState<NewEntry>(() => ({
    date: initial?.date ?? date,
    kind,
    source: initial?.source ?? prefill?.source ?? '',
    channel: initial?.channel ?? prefill?.channel ?? '',
    nationality: initial?.nationality ?? prefill?.nationality ?? '한국',
    interest: initial?.interest ?? prefill?.interest ?? '',
    amount: initial?.amount ?? null,
    patientName: initial?.patientName ?? prefill?.patientName ?? '',
    note: initial?.note ?? '',
  }))
  const set = <K extends keyof NewEntry>(k: K, v: NewEntry[K]) => setF((x) => ({ ...x, [k]: v }))
  const walkIn = kind === 'consult' && !initial && f.source === WALK_IN // 워크인은 문의도 1장 같이 센다
  const valid = f.source !== '' && (kind !== 'treatment' || (f.amount ?? 0) > 0)
  const add = (k: OptionKind) => onAddOption && ((n: string) => onAddOption(k, n))

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className={`dialog sheet sheet-${kind}`}
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          const clean: NewEntry = {
            ...f,
            channel: kind === 'inquiry' ? f.channel : '',
            amount: kind === 'treatment' ? f.amount : null,
            patientName: kind === 'inquiry' ? '' : f.patientName.trim(),
            note: f.note.trim(),
          }
          onSubmit(walkIn ? [clean, { ...clean, kind: 'inquiry', patientName: '' }] : [clean])
        }}
      >
        <div className="sheet-head">
          <h2>
            <span className={`kind-badge kind-${kind}`}>{KIND_LABEL[kind]}</span> {initial ? '수정' : '기록'}
          </h2>
          <input id="entry-date" type="date" className="sheet-date" value={f.date} max={localDate()} onChange={(e) => e.target.value && set('date', e.target.value)} />
        </div>
        <p className="help">{HELP[kind]}</p>

        <Chips label="유입 경로" value={f.source} options={options.source} onChange={(v) => set('source', v)} onAdd={add('source')} required />
        {walkIn && <p className="help ok">워크인: 저장하면 오늘 문의도 1건 같이 셉니다.</p>}
        {kind === 'inquiry' && <Chips label="문의 채널" value={f.channel} options={options.channel} onChange={(v) => set('channel', v)} onAdd={add('channel')} />}
        <Chips label="국적" value={f.nationality} options={options.nationality} onChange={(v) => set('nationality', v)} onAdd={add('nationality')} />
        <Chips label={kind === 'treatment' ? '시술' : '관심 시술'} value={f.interest} options={options.interest} onChange={(v) => set('interest', v)} onAdd={add('interest')} />

        {kind === 'treatment' && (
          <label className="amount-field">
            총액 (만원)
            <input id="entry-amount" type="number" inputMode="numeric" min={0} value={f.amount ?? ''} onChange={(e) => set('amount', numOrNull(e.target.value))} />
          </label>
        )}
        {kind !== 'inquiry' && (
          <div className="form-grid">
            <label>
              이름 <small>(선택)</small>
              <input id="entry-name" maxLength={40} autoComplete="off" value={f.patientName} onChange={(e) => set('patientName', e.target.value)} />
            </label>
            <label>
              메모 <small>(선택)</small>
              <input id="entry-note" maxLength={100} value={f.note} onChange={(e) => set('note', e.target.value)} />
            </label>
          </div>
        )}

        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary btn-big" disabled={!valid}>
            {valid ? '저장' : f.source === '' ? '유입 경로를 골라 주세요' : '총액을 입력해 주세요'}
          </button>
        </div>
      </form>
    </div>
  )
}
