import { useEffect, useState } from 'react'

// 브라우저 확인창 대신 쓰는 두 번 누르기 버튼 (3초 안에 한 번 더 누르면 실행)
export function ConfirmButton({ label, confirmLabel, className = '', onConfirm }: { label: string; confirmLabel: string; className?: string; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return
    const t = setTimeout(() => setArmed(false), 3000)
    return () => clearTimeout(t)
  }, [armed])
  return (
    <button
      className={`btn ${className}${armed ? ' btn-armed' : ''}`}
      onClick={() => {
        if (armed) {
          setArmed(false)
          onConfirm()
        } else setArmed(true)
      }}
    >
      {armed ? confirmLabel : label}
    </button>
  )
}
