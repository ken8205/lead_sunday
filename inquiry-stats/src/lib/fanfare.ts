// 1위 발표용 짧은 팡파레 (1~2초). 소리 파일 없이 Web Audio로 만든다.
// 이 기기에서 소리를 껐으면 울리지 않는다. 브라우저는 화면을 한 번 누른 뒤에만 소리를 허락한다.

const MUTE_KEY = 'inquiry-stats:fanfare-muted'

export function isMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

export function setMuted(muted: boolean) {
  try {
    if (muted) localStorage.setItem(MUTE_KEY, '1')
    else localStorage.removeItem(MUTE_KEY)
  } catch {
    // 저장이 막힌 브라우저면 이번 화면에서만 적용된다
  }
}

let ctx: AudioContext | null = null

// 빠라밤~ : 도-미-솔 올라가고 높은 도 화음으로 끝난다
const NOTES: [number, number, number][] = [
  // [주파수 Hz, 시작 초, 길이 초]
  [523.25, 0, 0.14],
  [659.25, 0.14, 0.14],
  [783.99, 0.28, 0.14],
  [1046.5, 0.42, 0.9],
  [783.99, 0.42, 0.9],
  [659.25, 0.42, 0.9],
]

export async function playFanfare(): Promise<boolean> {
  if (isMuted()) return false
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  try {
    ctx ??= new AC()
    if (ctx.state === 'suspended') await ctx.resume()
    if (ctx.state !== 'running') return false
    const t0 = ctx.currentTime + 0.02
    const master = ctx.createGain()
    master.gain.value = 0.18
    master.connect(ctx.destination)
    for (const [freq, start, len] of NOTES) {
      const osc = ctx.createOscillator()
      const g = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const s = t0 + start
      g.gain.setValueAtTime(0, s)
      g.gain.linearRampToValueAtTime(1, s + 0.02)
      g.gain.setValueAtTime(1, s + len * 0.6)
      g.gain.exponentialRampToValueAtTime(0.001, s + len)
      osc.connect(g).connect(master)
      osc.start(s)
      osc.stop(s + len + 0.05)
    }
    return true
  } catch {
    return false
  }
}
