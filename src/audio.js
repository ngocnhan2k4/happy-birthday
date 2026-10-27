// Nhạc hộp "Happy Birthday" tự tổng hợp bằng WebAudio, không cần file mp3
const MELODY = [
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [72, 1], [71, 2],
  [67, 0.75], [67, 0.25], [69, 1], [67, 1], [74, 1], [72, 2],
  [67, 0.75], [67, 0.25], [79, 1], [76, 1], [72, 1], [71, 1], [69, 2],
  [77, 0.75], [77, 0.25], [76, 1], [72, 1], [74, 1], [72, 2],
]
const BASS = [[0, 48], [6, 48], [12, 52], [19, 53]] // [beat, midi]
const BEAT = 0.62
const TOTAL = MELODY.reduce((s, [, d]) => s + d, 0) + 2

const freq = (m) => 440 * 2 ** ((m - 69) / 12)

let ac, master, bus, timer, muted = false

function setup() {
  ac = new (window.AudioContext || window.webkitAudioContext)()
  master = ac.createGain()
  master.gain.value = muted ? 0 : 0.5
  master.connect(ac.destination)

  bus = ac.createGain()
  const delay = ac.createDelay()
  delay.delayTime.value = 0.34
  const fb = ac.createGain()
  fb.gain.value = 0.38
  const wet = ac.createGain()
  wet.gain.value = 0.4
  bus.connect(master)
  bus.connect(delay)
  delay.connect(fb)
  fb.connect(delay)
  delay.connect(wet)
  wet.connect(master)
}

function tone(m, when, dur, vol) {
  const f = freq(m)
  const g = ac.createGain()
  g.gain.setValueAtTime(0.0001, when)
  g.gain.exponentialRampToValueAtTime(vol, when + 0.006)
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur * 1.9)
  g.connect(bus)
  ;[[f, 'sine', 1], [f * 2, 'triangle', 0.25], [f * 4, 'sine', 0.08]].forEach(([fr, type, k]) => {
    const o = ac.createOscillator()
    const og = ac.createGain()
    og.gain.value = k
    o.type = type
    o.frequency.value = fr
    o.connect(og)
    og.connect(g)
    o.start(when)
    o.stop(when + dur * 2 + 0.1)
  })
}

function schedule(start) {
  let t = start
  MELODY.forEach(([m, d]) => {
    tone(m, t, d * BEAT, 0.28)
    t += d * BEAT
  })
  BASS.forEach(([b, m]) => tone(m, start + b * BEAT, 3 * BEAT, 0.16))
  timer = setTimeout(() => schedule(ac.currentTime + 0.1), (TOTAL * BEAT - 0.3) * 1000)
}

export function startMusic() {
  if (!ac) setup()
  if (ac.state === 'suspended') ac.resume()
  if (timer) return // đang phát (ví dụ khi bấm xem lại)
  schedule(ac.currentTime + 0.2)
}

export function setMuted(v) {
  muted = v
  if (master) master.gain.value = v ? 0 : 0.5
}
