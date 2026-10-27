import { useCallback, useEffect, useRef, useState } from 'react'
import { config } from './config.js'
import { createEngine, textShape, heartShape } from './engine.js'
import { startMusic, setMuted } from './audio.js'

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function App() {
  const canvasRef = useRef(null)
  const engine = useRef(null)
  const token = useRef(0)
  const [phase, setPhase] = useState('start') // start | play | final
  const [muted, setMute] = useState(false)

  useEffect(() => {
    engine.current = createEngine(canvasRef.current)
    return () => engine.current.destroy()
  }, [])

  const run = useCallback(async () => {
    const eng = engine.current
    const me = ++token.current
    const alive = () => token.current === me
    const show = async (lines, ms, opts, y = 0.5) => {
      eng.setShape(textShape(lines, { y }), opts)
      await wait(ms)
      return alive()
    }

    eng.reset()
    setPhase('play')
    try { await document.fonts.load('700 100px "Dancing Script"') } catch { /* dùng font dự phòng */ }
    if (!alive()) return

    for (const n of ['3', '2', '1']) {
      if (!(await show(n, 1100, { hue: [38, 55] }))) return
    }

    eng.fireworks(true)
    eng.launch(innerWidth * 0.3, 'heart')
    eng.launch(innerWidth * 0.7, 'ring')
    if (!(await show(['Happy', 'Birthday'], 4800, { hue: [320, 350] }, 0.46))) return

    if (!(await show(config.name, 3800, { hue: [290, 330] }))) return

    for (const l of config.lines) {
      if (!(await show(l, 3200, { hue: [180, 340] }, 0.46))) return
    }

    eng.setShape(heartShape({ y: 0.3, width: 0.5 }), { hue: [335, 355] })
    eng.lanterns(true)
    setPhase('final')
  }, [])

  const begin = () => {
    startMusic()
    run()
  }

  const toggleMute = () => {
    setMute((m) => {
      setMuted(!m)
      return !m
    })
  }

  return (
    <>
      <canvas ref={canvasRef} className="stage" />

      {phase === 'start' && (
        <div className="overlay start">
          <p className="eyebrow">Có một điều bất ngờ</p>
          <h1 className="script">dành cho {config.name}</h1>
          <button className="go" onClick={begin}>Bắt đầu</button>
          <p className="tip">
            <span className="tip-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M3 9v6h4l5 4V5L7 9H3z" />
                <path className="wave w1" d="M15.5 8.5a5 5 0 0 1 0 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path className="wave w2" d="M18.5 5.5a9 9 0 0 1 0 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="tip-text">Bật loa để có trải nghiệm <b>tốt nhất</b></span>
          </p>
        </div>
      )}

      {phase !== 'start' && (
        <div className="controls">
          <button className={`music ${muted ? 'off' : ''}`} onClick={toggleMute} aria-label="Bật/tắt nhạc">
            <span className="eq"><i /><i /><i /><i /></span>
          </button>
          <button className="replay" onClick={begin} aria-label="Xem lại">Xem lại</button>
        </div>
      )}

      {phase === 'play' && <p className="hint">Chạm vào màn hình để bắn pháo hoa</p>}

      {phase === 'final' && (
        <article className="card">
          <h2 className="script">Gửi {config.name}</h2>
          <p>{config.letter}</p>
          <ul className="wishes">
            {config.wishes.map((w) => <li key={w}>{w}</li>)}
          </ul>
          <p>{config.closing}</p>
          <p className="sign script">— {config.from} —</p>
        </article>
      )}
    </>
  )
}
