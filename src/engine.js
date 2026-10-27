const rand = (a, b) => a + Math.random() * (b - a)
const FONT = '"Dancing Script", cursive'

/* ---------- Shapes: hàm ({W,H}) => mảng điểm [x,y] ---------- */

export function textShape(lines, { y = 0.5, scale = 1 } = {}) {
  const arr = Array.isArray(lines) ? lines : [lines]
  return ({ W, H }) => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    const g = c.getContext('2d', { willReadFrequently: true })
    let size = Math.min(W * 0.2, 170) * scale
    g.font = `700 ${size}px ${FONT}`
    const widest = Math.max(...arr.map((l) => g.measureText(l).width))
    size *= Math.min(1, (W * 0.86) / widest)
    g.font = `700 ${size}px ${FONT}`
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillStyle = '#fff'
    const lh = size * 1.2
    const top = H * y - ((arr.length - 1) * lh) / 2
    arr.forEach((l, i) => g.fillText(l, W / 2, top + i * lh))

    const data = g.getImageData(0, 0, W, H).data
    const step = W < 600 ? 3 : 4
    const pts = []
    for (let yy = 0; yy < H; yy += step)
      for (let xx = 0; xx < W; xx += step) if (data[(yy * W + xx) * 4 + 3] > 128) pts.push([xx, yy])
    return pts
  }
}

export function heartShape({ y = 0.5, width = 0.7 } = {}) {
  return ({ W, H }) => {
    const s = Math.min(W * width, H * 0.5) / 32
    const pts = []
    for (let i = 0; i < 3200; i++) {
      const t = rand(0, Math.PI * 2)
      const k = i < 1100 ? 1 : Math.sqrt(Math.random())
      pts.push([
        W / 2 + 16 * Math.sin(t) ** 3 * s * k,
        H * y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s * k,
      ])
    }
    return pts
  }
}

/* ---------- Engine ---------- */

export function createEngine(canvas) {
  const ctx = canvas.getContext('2d')
  const N = 2600
  let W, H, dpr, bg
  let stars = [], shoot = [], rockets = [], sparks = [], lanterns = []
  let shape = null
  let hue = [320, 350]
  let auto = false
  let wantLanterns = false
  let nextAuto = 0
  let nextLantern = 0
  let nextShoot = 0
  const mouse = { x: -999, y: -999 }

  const parts = Array.from({ length: N }, () => ({
    x: Math.random() * innerWidth,
    y: Math.random() * innerHeight,
    vx: 0, vy: 0, tx: 0, ty: 0,
    a: 0, h: 330, s: 1.8, ph: Math.random() * 6.28,
  }))

  function assign() {
    if (!shape) return
    const pts = shape({ W, H })
    if (!pts.length) return
    for (let i = pts.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0
      ;[pts[i], pts[j]] = [pts[j], pts[i]]
    }
    parts.forEach((p, i) => {
      const t = pts[i % pts.length]
      const reuse = i >= pts.length
      p.tx = t[0] + (reuse ? rand(-2, 2) : 0)
      p.ty = t[1] + (reuse ? rand(-2, 2) : 0)
      p.h = rand(hue[0], hue[1])
      p.s = rand(1.2, 2.4)
      p.vx += rand(-5, 5)
      p.vy += rand(-5, 5)
    })
  }

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2)
    W = innerWidth
    H = innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = W + 'px'
    canvas.style.height = H + 'px'
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bg = ctx.createLinearGradient(0, 0, 0, H)
    bg.addColorStop(0, '#060313')
    bg.addColorStop(0.65, '#150a2e')
    bg.addColorStop(1, '#3a1240')
    ctx.globalAlpha = 1
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    stars = Array.from({ length: Math.round((W * H) / 6500) }, () => ({
      x: Math.random() * W, y: Math.random() * H * 0.9,
      r: rand(0.4, 1.4), ph: rand(0, 6.28), sp: rand(0.001, 0.004),
    }))
    assign()
  }

  /* --- fireworks --- */
  function burst(x, y, type = 'sphere', h = rand(0, 360)) {
    const count = type === 'heart' ? 110 : 90
    for (let i = 0; i < count; i++) {
      let vx, vy
      if (type === 'heart') {
        const t = (i / count) * Math.PI * 2
        const k = rand(0.9, 1) * 0.3
        vx = 16 * Math.sin(t) ** 3 * k
        vy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * k
      } else {
        const a = rand(0, Math.PI * 2)
        const sp = type === 'ring' ? 4.2 + rand(-0.15, 0.15) : rand(0.8, 5.5)
        vx = Math.cos(a) * sp
        vy = Math.sin(a) * sp
      }
      sparks.push({ x, y, vx, vy, life: 1, decay: rand(0.007, 0.014), h: h + rand(-14, 14), s: rand(1.2, 2.4) })
    }
  }

  function launch(x = rand(W * 0.12, W * 0.88), type) {
    const ty = rand(H * 0.12, H * 0.42)
    rockets.push({ x, y: H + 10, vy: -Math.sqrt(2 * 0.12 * (H - ty)), type: type || pickType(), h: rand(0, 360) })
  }
  const pickType = () => {
    const r = Math.random()
    return r < 0.32 ? 'heart' : r < 0.6 ? 'ring' : 'sphere'
  }

  /* --- main loop --- */
  let raf
  function frame(now) {
    // nền + vệt mờ
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.32
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, W, H)
    ctx.globalAlpha = 1

    ctx.globalCompositeOperation = 'lighter'
    // sao
    for (const s of stars) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(now * s.sp + s.ph))
      ctx.fillStyle = `rgba(255,240,255,${a})`
      ctx.fillRect(s.x, s.y, s.r, s.r)
    }
    // sao băng
    if (now > nextShoot) {
      shoot.push({ x: rand(W * 0.2, W), y: rand(0, H * 0.3), vx: rand(-9, -6), vy: rand(3, 5), life: 1 })
      nextShoot = now + rand(2500, 6000)
    }
    shoot = shoot.filter((s) => s.life > 0)
    for (const s of shoot) {
      s.x += s.vx
      s.y += s.vy
      s.life -= 0.018
      const g = ctx.createLinearGradient(s.x, s.y, s.x - s.vx * 9, s.y - s.vy * 9)
      g.addColorStop(0, `rgba(255,255,255,${s.life})`)
      g.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.strokeStyle = g
      ctx.lineWidth = 1.6
      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(s.x - s.vx * 9, s.y - s.vy * 9)
      ctx.stroke()
    }

    drawLanterns(now)

    // pháo hoa
    if (auto && now > nextAuto) {
      launch()
      nextAuto = now + rand(600, 1300)
    }
    rockets = rockets.filter((r) => {
      r.y += r.vy
      r.vy += 0.12
      ctx.fillStyle = `hsl(${r.h},100%,75%)`
      ctx.fillRect(r.x, r.y, 2.4, 6)
      if (r.vy >= -0.4) {
        burst(r.x, r.y, r.type, r.h)
        return false
      }
      return true
    })
    sparks = sparks.filter((s) => s.life > 0)
    for (const s of sparks) {
      s.x += s.vx
      s.y += s.vy
      s.vx *= 0.985
      s.vy = s.vy * 0.985 + 0.04
      s.life -= s.decay
      ctx.fillStyle = `hsla(${s.h},100%,${55 + s.life * 25}%,${Math.max(s.life, 0)})`
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.s * (0.4 + s.life * 0.6), 0, 6.283)
      ctx.fill()
    }

    // hạt tạo hình
    const active = !!shape
    for (const p of parts) {
      if (active) {
        p.vx += (p.tx - p.x) * 0.04
        p.vy += (p.ty - p.y) * 0.04
        p.vx *= 0.88
        p.vy *= 0.88
      } else {
        p.vx *= 0.97
        p.vy *= 0.97
      }
      const dx = p.x - mouse.x
      const dy = p.y - mouse.y
      const d2 = dx * dx + dy * dy
      if (d2 < 14400 && d2 > 0.1) {
        const d = Math.sqrt(d2)
        const f = (1 - d / 120) * 5
        p.vx += (dx / d) * f
        p.vy += (dy / d) * f
      }
      p.x += p.vx
      p.y += p.vy
      p.a += ((active ? 1 : 0) - p.a) * 0.06
      if (p.a < 0.02) continue
      const tw = 0.75 + 0.35 * Math.sin(now * 0.006 + p.ph)
      ctx.fillStyle = `hsla(${p.h},100%,72%,${p.a * tw})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.s * tw, 0, 6.283)
      ctx.fill()
    }

    raf = requestAnimationFrame(frame)
  }

  function drawLanterns(now) {
    if (wantLanterns && lanterns.length < 14 && now > nextLantern) {
      lanterns.push({ x: rand(0, W), y: H + 60, s: rand(16, 30), vy: rand(0.35, 0.8), ph: rand(0, 6.28) })
      nextLantern = now + 600
    }
    lanterns = lanterns.filter((l) => l.y > -80)
    for (const l of lanterns) {
      l.y -= l.vy
      const x = l.x + Math.sin(now * 0.0008 + l.ph) * 18
      const fl = 0.85 + 0.15 * Math.sin(now * 0.01 + l.ph)
      const glow = ctx.createRadialGradient(x, l.y, 0, x, l.y, l.s * 3)
      glow.addColorStop(0, `rgba(255,170,70,${0.35 * fl})`)
      glow.addColorStop(1, 'rgba(255,170,70,0)')
      ctx.fillStyle = glow
      ctx.fillRect(x - l.s * 3, l.y - l.s * 3, l.s * 6, l.s * 6)
      const body = ctx.createLinearGradient(x, l.y - l.s, x, l.y + l.s)
      body.addColorStop(0, `rgba(255,214,120,${fl})`)
      body.addColorStop(1, `rgba(255,120,60,${fl})`)
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.moveTo(x - l.s * 0.55, l.y - l.s)
      ctx.lineTo(x + l.s * 0.55, l.y - l.s)
      ctx.lineTo(x + l.s * 0.4, l.y + l.s * 0.9)
      ctx.lineTo(x - l.s * 0.4, l.y + l.s * 0.9)
      ctx.closePath()
      ctx.fill()
    }
  }

  /* --- events --- */
  const onMove = (e) => { mouse.x = e.clientX; mouse.y = e.clientY }
  const onLeave = () => { mouse.x = mouse.y = -999 }
  const onDown = (e) => {
    onMove(e)
    launch(e.clientX, pickType())
  }
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerleave', onLeave)
  canvas.addEventListener('pointerdown', onDown)
  addEventListener('resize', resize)
  resize()
  raf = requestAnimationFrame(frame)

  return {
    setShape(fn, opts = {}) {
      shape = fn
      if (opts.hue) hue = opts.hue
      if (!fn) {
        parts.forEach((p) => {
          const a = rand(0, 6.28)
          const v = rand(4, 14)
          p.vx += Math.cos(a) * v
          p.vy += Math.sin(a) * v
        })
      }
      assign()
    },
    burst,
    launch,
    fireworks(v) { auto = v },
    lanterns(v) { wantLanterns = v },
    reset() {
      shape = null
      auto = false
      wantLanterns = false
      rockets = []
    },
    destroy() {
      cancelAnimationFrame(raf)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerleave', onLeave)
      canvas.removeEventListener('pointerdown', onDown)
      removeEventListener('resize', resize)
    },
  }
}
