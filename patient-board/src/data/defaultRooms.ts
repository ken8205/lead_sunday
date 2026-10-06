import type { Room } from '../types'

// 원장님 손스케치 기준 배치. 스케치 좌표(건물 왼쪽 위 = 0,0)를 SCALE 배 키워서 사용한다.
// 설정 화면에서 수정 가능하게 할 예정.
const SCALE = 1.3
const PAD = 16
const LEFT_EXTRA = 0

const toPx = (v: number, extra = 0) => Math.round((v + extra) * SCALE + PAD)

// [id, 이름, x, y, w, h, 장식 여부]
const layout: [string, string, number, number, number, number, boolean?][] = [
  ['or', '수술실(OR)', 125, 0, 275, 145],
  ['pantry', '탕비실', 400, 0, 230, 142],
  ['treat', '치료실', 400, 143, 230, 142],
  ['recov2', '회복실 II', 415, 285, 215, 140],
  ['dressing', '탈의실', 120, 155, 135, 75],
  ['powder', '파우더룸', 255, 155, 135, 75],
  ['recov1', '회복실 I', 175, 235, 160, 170],
  ['desk', '데스크', 20, 430, 230, 85], // 스케치에 없음: 임의 배치(확인 필요)
  ['wait', '대기실', 25, 520, 410, 320],
  ['consult2', '상담실 II / 촬영실', 485, 520, 145, 145],
  ['consult1', '상담실 I', 485, 665, 145, 175],
  ['wc', 'W.C', 0, 45, 80, 140, true],
]

export const defaultRooms: Room[] = layout.map(([id, name, x, y, w, h, decor], i) => ({
  id,
  name,
  x: toPx(x, LEFT_EXTRA),
  y: toPx(y),
  w: Math.round(w * SCALE),
  h: Math.round(h * SCALE),
  order: i,
  decor,
}))

// 건물 외곽선과 전체 캔버스 크기
export const building = {
  x: toPx(0, LEFT_EXTRA),
  y: toPx(0),
  w: Math.round(630 * SCALE),
  h: Math.round(840 * SCALE),
}
export const canvas = {
  w: Math.round((630 + LEFT_EXTRA) * SCALE) + PAD * 2,
  h: Math.round(840 * SCALE) + PAD * 2,
}
