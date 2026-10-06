import { useState } from 'react'
import type { Category, Room } from '../types'
import { CATEGORY_LABEL } from '../types'
import type { NewPatient } from '../store/useBoard'

const STAFF_SUGGESTIONS = ['유빈', '도은', '정실장']

interface Props {
  rooms: Room[]
  defaultRoomId: string
  onSubmit: (p: NewPatient, roomId: string) => void
  onClose: () => void
}

export function AddPatientDialog({ rooms, defaultRoomId, onSubmit, onClose }: Props) {
  const [name, setName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [procedure, setProcedure] = useState('')
  const [category, setCategory] = useState<Category>('consult')
  const [staff, setStaff] = useState('')
  const [roomId, setRoomId] = useState(defaultRoomId)

  const isMeeting = category === 'meeting' // 미팅은 생년월일 없이 이름과 목적만 받는다
  const valid = name.trim() !== '' && (isMeeting || birthDate !== '') && procedure.trim() !== ''
  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="overlay" onClick={onClose}>
      <form
        className="dialog"
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          onSubmit({ name: name.trim(), birthDate: isMeeting ? '' : birthDate, procedure: procedure.trim(), category, staff: staff.trim() }, roomId)
        }}
      >
        <h2>환자 카드 추가</h2>
        <label>
          분류
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c]}
              </option>
            ))}
          </select>
        </label>
        <label>
          {isMeeting ? '이름' : '환자 이름'}
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        {!isMeeting && (
          <label>
            생년월일
            <input type="date" min="1900-01-01" max={today} value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
          </label>
        )}
        <label>
          {isMeeting ? '목적' : '수술/시술명'}
          <input value={procedure} onChange={(e) => setProcedure(e.target.value)} />
        </label>
        <label>
          담당자
          <input list="staff-list" value={staff} onChange={(e) => setStaff(e.target.value)} />
          <datalist id="staff-list">
            {STAFF_SUGGESTIONS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label>
          처음 놓을 방
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            {rooms
              .filter((r) => !r.decor)
              .map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <div className="dialog-actions">
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button type="submit" className="btn btn-primary" disabled={!valid}>
            추가
          </button>
        </div>
      </form>
    </div>
  )
}
