// 1위 발표용 팡파레 (약 2.5초). 소리 파일 없이 Web Audio로 금관 소리를 흉내 낸다.
// "빠바바 빰~ 빠바 빠~~~" + 팀파니 + 심벌 + 울림. 이 기기에서 소리를 껐으면 울리지 않는다.
// 브라우저는 화면을 한 번 누른 뒤에만 소리를 허락한다.

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

const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
const G4 = 67, C5 = 72, E5 = 76, G5 = 79, C4 = 60, E4 = 64, G3 = 55

// [음, 시작 초, 길이 초, 세기]
const MELODY: [number, number, number, number][] = [
  [G4, 0.0, 0.11, 0.8],
  [G4, 0.13, 0.11, 0.8],
  [G4, 0.26, 0.11, 0.8],
  [C5, 0.39, 0.42, 1],
  [G4, 0.86, 0.13, 0.85],
  [C5, 1.01, 0.13, 0.9],
  [E5, 1.16, 1.25, 1],
]
// 마지막 화음을 받쳐 주는 금관 (트롬본·호른 자리)
const CHORD_AT = 1.16
const CHORD: number[] = [G5, C5, G4, E4, C4, G3]

let ctx: AudioContext | null = null
let reverb: AudioBuffer | null = null

function impulse(c: BaseAudioContext, seconds: number): AudioBuffer {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(2, len, c.sampleRate)
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch)
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3
  }
  return buf
}

// 금관 한 음: 살짝 어긋난 톱니파 3개 + 처음에 밝아지는 필터("빠"하는 입술 소리) + 긴 음은 비브라토
function brass(c: BaseAudioContext, out: AudioNode, midi: number, t: number, len: number, vel: number) {
  const f = hz(midi)
  const g = c.createGain()
  const lp = c.createBiquadFilter()
  lp.type = 'lowpass'
  lp.Q.value = 1.2
  lp.frequency.setValueAtTime(f * 1.5, t)
  lp.frequency.linearRampToValueAtTime(f * 7, t + 0.04)
  lp.frequency.exponentialRampToValueAtTime(f * 4, t + 0.18)
  g.gain.setValueAtTime(0, t)
  g.gain.linearRampToValueAtTime(vel, t + 0.025)
  g.gain.exponentialRampToValueAtTime(vel * 0.7, t + 0.15)
  g.gain.setValueAtTime(vel * 0.7, t + Math.max(0.16, len - 0.08))
  g.gain.exponentialRampToValueAtTime(0.001, t + len + 0.12)
  lp.connect(g).connect(out)
  if (len > 0.6) {
    const lfo = c.createOscillator()
    const depth = c.createGain()
    lfo.frequency.value = 5.5
    depth.gain.setValueAtTime(0, t)
    depth.gain.linearRampToValueAtTime(f * 0.006, t + 0.5)
    lfo.connect(depth)
    lfo.start(t)
    lfo.stop(t + len + 0.2)
    for (const cents of [-7, 0, 7]) addOsc(cents, depth)
  } else {
    for (const cents of [-7, 0, 7]) addOsc(cents, null)
  }
  function addOsc(cents: number, vib: GainNode | null) {
    const o = c.createOscillator()
    o.type = 'sawtooth'
    o.frequency.value = f
    o.detune.value = cents
    if (vib) vib.connect(o.frequency)
    o.connect(lp)
    o.start(t)
    o.stop(t + len + 0.2)
  }
}

function noise(c: BaseAudioContext, seconds: number): AudioBufferSourceNode {
  const len = Math.floor(c.sampleRate * seconds)
  const buf = c.createBuffer(1, len, c.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
  const s = c.createBufferSource()
  s.buffer = buf
  return s
}

// 팀파니: 낮은 음이 살짝 떨어지며 울리고, 가죽 치는 소리
function timpani(c: BaseAudioContext, out: AudioNode, t: number, vel: number) {
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = 'sine'
  o.frequency.setValueAtTime(hz(C4 - 12) * 1.08, t)
  o.frequency.exponentialRampToValueAtTime(hz(C4 - 12), t + 0.25)
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 1.4)
  o.connect(g).connect(out)
  o.start(t)
  o.stop(t + 1.5)
  const n = noise(c, 0.15)
  const lp = c.createBiquadFilter()
  const ng = c.createGain()
  lp.type = 'lowpass'
  lp.frequency.value = 900
  ng.gain.setValueAtTime(vel * 0.6, t)
  ng.gain.exponentialRampToValueAtTime(0.001, t + 0.12)
  n.connect(lp).connect(ng).connect(out)
  n.start(t)
}

// 심벌: 높은 잡음이 길게 퍼진다
function cymbal(c: BaseAudioContext, out: AudioNode, t: number, vel: number) {
  const n = noise(c, 2.2)
  const hp = c.createBiquadFilter()
  const g = c.createGain()
  hp.type = 'highpass'
  hp.frequency.value = 5000
  g.gain.setValueAtTime(vel, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + 2.1)
  n.connect(hp).connect(g).connect(out)
  n.start(t)
}

// 팡파레 전체를 c의 out으로 보낸다. 시험용으로 OfflineAudioContext에도 쓸 수 있다.
export function scheduleFanfare(c: BaseAudioContext, out: AudioNode, t0: number) {
  const comp = c.createDynamicsCompressor()
  comp.threshold.value = -14
  comp.ratio.value = 4
  const master = c.createGain()
  master.gain.value = 0.5
  comp.connect(master).connect(out)
  const dry = c.createGain()
  dry.gain.value = 1
  dry.connect(comp)
  const conv = c.createConvolver()
  conv.buffer = reverb && reverb.sampleRate === c.sampleRate ? reverb : impulse(c, 1.8)
  const wet = c.createGain()
  wet.gain.value = 0.3
  dry.connect(conv).connect(wet).connect(comp)

  const lead = c.createGain()
  lead.gain.value = 0.22
  lead.connect(dry)
  for (const [m, s, len, v] of MELODY) {
    brass(c, lead, m, t0 + s, len, v)
    brass(c, lead, m - 12, t0 + s, len, v * 0.5) // 한 옥타브 아래로 두껍게
  }
  const section = c.createGain()
  section.gain.value = 0.09
  section.connect(dry)
  for (const m of CHORD) brass(c, section, m, t0 + CHORD_AT, 1.25, 0.9)
  timpani(c, dry, t0 + 0.39, 0.5)
  timpani(c, dry, t0 + CHORD_AT, 0.8)
  cymbal(c, dry, t0 + CHORD_AT, 0.12)
}

export async function playFanfare(): Promise<boolean> {
  if (isMuted()) return false
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  try {
    ctx ??= new AC()
    if (ctx.state === 'suspended') await ctx.resume()
    if (ctx.state !== 'running') return false
    reverb ??= impulse(ctx, 1.8)
    scheduleFanfare(ctx, ctx.destination, ctx.currentTime + 0.03)
    return true
  } catch {
    return false
  }
}
