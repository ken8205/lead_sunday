// SVG 글자는 자동으로 줄바꿈되지 않아서, 글자 폭을 어림해 카드 안에 들어가게 맞춘다.
// 한글·한자 등 넓은 글자는 글자 크기와 같은 폭, 영문 대문자·소문자·숫자는 더 좁게 센다.
const WIDE = /[ᄀ-ᇿ㄰-㆏가-힣　-鿿＀-￯]/

export function textWidth(text: string, fontSize: number, bold = false): number {
  let w = 0
  for (const ch of text) {
    if (WIDE.test(ch)) w += 1
    else if (ch === ' ') w += 0.3
    else if (/[A-Z]/.test(ch)) w += 0.68
    else if (/[(),.:·\-/]/.test(ch)) w += 0.35
    else w += 0.56
  }
  return w * fontSize * (bold ? 1.06 : 1)
}

export interface Fit {
  fontSize: number
  textLength?: number // 줄여도 안 들어가면 글자를 가로로 눌러서 맞춘다
}

// 글자 크기를 minFs까지 줄여 보고, 그래도 넘치면 가로로 눌러서 maxW에 맞춘다.
export function fitText(text: string, fontSize: number, maxW: number, minFs: number, bold = false): Fit {
  let f = fontSize
  while (f > minFs && textWidth(text, f, bold) > maxW) f -= 0.5
  return textWidth(text, f, bold) > maxW ? { fontSize: f, textLength: maxW } : { fontSize: f }
}

// 이름을 최대 2줄로 나눈다(띄어쓰기 기준, 한 단어가 너무 길면 글자 단위). 2줄에 안 들어가면 글자를 줄이고, 끝까지 안 되면 말줄임.
export function wrapName(name: string, fontSize: number, maxW: number, minFs = 9.5): { lines: string[]; fontSize: number } {
  for (let f = fontSize; f >= minFs; f -= 0.5) {
    const lines: string[] = []
    let cur = ''
    const push = (t: string) => {
      lines.push(t)
      cur = ''
    }
    for (const word of name.split(' ')) {
      const trial = cur ? `${cur} ${word}` : word
      if (textWidth(trial, f, true) <= maxW) {
        cur = trial
        continue
      }
      if (cur) push(cur)
      // 한 단어가 한 줄보다 길면 글자 단위로 나눈다
      let piece = ''
      for (const ch of word) {
        if (textWidth(piece + ch, f, true) > maxW) {
          push(piece)
          piece = ch
        } else piece += ch
      }
      cur = piece
    }
    if (cur) push(cur)
    if (lines.length <= 2) return { lines, fontSize: f }
  }
  const f = minFs
  const rest = name.split('')
  let first = ''
  while (rest.length && textWidth(first + rest[0], f, true) <= maxW) first += rest.shift()!
  let second = rest.join('')
  while (second.length > 1 && textWidth(second + '…', f, true) > maxW) second = second.slice(0, -1)
  return { lines: [first, rest.length ? second + '…' : second], fontSize: f }
}
