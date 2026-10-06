import type { Room } from '../types'

// 손스케치의 방 위치 관계를 유지하면서 격자에 맞춰 정리한 배치 (실제 크기와는 다름).
// 설정 화면에서 수정 가능하게 할 예정.
type Tone = NonNullable<Room['tone']>

// [id, 이름, x, y, w, h, 색, 장식 여부]
const layout: [string, string, number, number, number, number, Tone, boolean?][] = [
  // 윗줄
  ['wc', 'W.C', 30, 30, 120, 160, 'support', true],
  ['or', '수술실(OR)', 160, 30, 420, 160, 'clinic'],
  ['pantry', '탕비실', 590, 30, 340, 160, 'support'],
  // 가운데
  ['dressing', '탈의실', 160, 200, 205, 110, 'support'],
  ['powder', '파우더룸', 375, 200, 205, 110, 'support'],
  ['recov1', '회복실 I', 160, 320, 420, 230, 'clinic'],
  ['treat', '치료실', 590, 200, 340, 170, 'clinic'],
  ['recov2', '회복실 II', 590, 380, 340, 170, 'clinic'],
  // 데스크 (스케치에 없음: 임의 배치, 확인 필요)
  ['desk', '데스크', 30, 565, 400, 110, 'front'],
  // 아랫줄
  ['wait', '대기실', 30, 690, 540, 290, 'front'],
  ['consult2', '상담실 II / 촬영실', 590, 690, 340, 140, 'clinic'],
  ['consult1', '상담실 I', 590, 840, 340, 140, 'clinic'],
]

export const defaultRooms: Room[] = layout.map(([id, name, x, y, w, h, tone, decor], i) => ({
  id,
  name,
  x,
  y,
  w,
  h,
  tone,
  order: i,
  decor,
}))

// 건물 외곽선과 전체 캔버스 크기
export const building = { x: 20, y: 20, w: 920, h: 970 }
export const canvas = { w: 960, h: 1010 }
