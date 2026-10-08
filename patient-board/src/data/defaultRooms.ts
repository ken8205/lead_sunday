import type { Room } from '../types'

// 손스케치의 방 위치 관계를 유지하면서 격자에 맞춰 정리한 배치 (실제 크기와는 다름).
// 설정 화면에서 수정 가능하게 할 예정.
type Tone = NonNullable<Room['tone']>

// [id, 이름, x, y, w, h, 색, 장식 여부]
const layout: [string, string, number, number, number, number, Tone, boolean?][] = [
  // 윗줄
  ['wc', 'W.C', 30, 30, 120, 170, 'support', true],
  ['or', 'OR', 160, 30, 420, 170, 'clinic'],
  ['pantry', '탕비실', 590, 30, 340, 170, 'support'],
  // 가운데
  ['dressing', '회복실3', 160, 210, 205, 120, 'support'],
  ['powder', '파우더룸', 375, 210, 205, 120, 'support'],
  ['recov1', '회복실 I', 160, 340, 420, 256, 'clinic'],
  ['treat', '치료실', 590, 210, 340, 196, 'clinic'],
  ['recov2', '회복실 II', 590, 416, 340, 196, 'clinic'], // 카드 2줄이 들어가는 높이
  // 데스크는 회복실 I 바로 아래에 맞춘다.
  ['desk', '데스크', 160, 611, 420, 110, 'front'],
  // 아랫줄
  ['wait', '대기실', 30, 731, 540, 293, 'front'],
  ['consult2', '상담실 II / 촬영실', 590, 622, 340, 196, 'clinic'],
  ['consult1', '상담실 I', 590, 828, 340, 196, 'clinic'],
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
export const building = { x: 20, y: 20, w: 920, h: 1017 }
export const canvas = { w: 960, h: 1057 }

// 방을 추가하거나 옮겨도 모두 보이도록 캔버스 크기를 방 위치에서 계산한다.
export function canvasFor(rooms: Room[]) {
  return {
    w: Math.max(canvas.w, ...rooms.map((r) => r.x + r.w + 30)),
    h: Math.max(canvas.h, ...rooms.map((r) => r.y + r.h + 30)),
  }
}
