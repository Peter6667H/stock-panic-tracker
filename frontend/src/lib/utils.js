import { PANIC_LEVELS } from './constants.js'

export function getPanicLevel(score) {
  return PANIC_LEVELS.find(l => score >= l.min) || PANIC_LEVELS.at(-1)
}

export function fmtPrice(p, prefix = '$') {
  if (p == null || isNaN(p)) return '--'
  if (p > 10_000) return prefix + p.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (p > 1_000)  return prefix + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (p > 100)    return prefix + p.toFixed(2)
  return prefix + p.toFixed(4)
}

export function fmtChg(change, pct) {
  if (change == null) return { text: '--', cls: '' }
  const sign = change >= 0 ? '+' : ''
  const arrow = change >= 0 ? '▲' : '▼'
  return {
    text: `${arrow} ${sign}${pct.toFixed(2)}%  (${sign}${change.toFixed(2)})`,
    cls:  change >= 0 ? 'positive' : 'negative',
  }
}

export function fmtVol(v) {
  if (!v) return '--'
  if (v > 1e9) return (v / 1e9).toFixed(2) + 'B'
  if (v > 1e6) return (v / 1e6).toFixed(2) + 'M'
  if (v > 1e3) return (v / 1e3).toFixed(1) + 'K'
  return String(v)
}

export function fmtMktCap(mc) {
  if (!mc) return '--'
  if (mc > 1e12) return '$' + (mc / 1e12).toFixed(2) + 'T'
  if (mc > 1e9)  return '$' + (mc / 1e9).toFixed(1) + 'B'
  return '$' + (mc / 1e6).toFixed(0) + 'M'
}

export function rangePos(price, low52, high52) {
  if (!high52 || !low52 || high52 === low52) return 50
  return Math.round(Math.min(100, Math.max(0, (price - low52) / (high52 - low52) * 100)))
}

export function calculatePanic(quotes) {
  const vix    = quotes['^VIX']?.price ?? 20
  const vixScore = Math.min(100, Math.max(0, (vix - 10) / 40 * 100))

  const mag7Syms = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA']
  const avgChg   = mag7Syms.map(s => quotes[s]?.pct ?? 0).reduce((a, b) => a + b, 0) / mag7Syms.length
  const chgScore = Math.min(100, Math.max(0, (-avgChg + 5) / 10 * 100))

  const sqqqPct   = quotes['SQQQ']?.pct ?? 0
  const sqqqBonus = Math.min(15, Math.max(0, sqqqPct * 1.5))

  return Math.round(Math.min(100, Math.max(0, vixScore * 0.5 + chgScore * 0.4 + sqqqBonus * 0.1)))
}

export function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null
  let gains = 0, losses = 0
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1]
    if (d >= 0) gains += d; else losses -= d
  }
  let ag = gains / period, al = losses / period
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1]
    ag = (ag * (period - 1) + Math.max(0,  d)) / period
    al = (al * (period - 1) + Math.max(0, -d)) / period
  }
  if (al === 0) return 100
  return +(100 - 100 / (1 + ag / al)).toFixed(2)
}

export function buildRSISeries(candles, period = 14) {
  const series = []
  const closes = candles.map(c => c.close)
  for (let i = period; i < closes.length; i++) {
    const rsi = calcRSI(closes.slice(0, i + 1), period)
    if (rsi != null) series.push({ time: candles[i].time, value: rsi })
  }
  return series
}

export function maLine(candles, period) {
  const out = []
  for (let i = period - 1; i < candles.length; i++) {
    let s = 0
    for (let j = i - period + 1; j <= i; j++) s += candles[j].close
    out.push({ time: candles[i].time, value: +(s / period).toFixed(4) })
  }
  return out
}

export function scaleColor(v) {
  if (v >= 75) return '#ef4444'
  if (v >= 55) return '#f97316'
  if (v >= 40) return '#eab308'
  if (v >= 20) return '#84cc16'
  return '#22c55e'
}

export function drawGauge(canvas, score) {
  const ctx = canvas.getContext('2d')
  const W = canvas.width, H = canvas.height
  ctx.clearRect(0, 0, W, H)

  const cx     = W / 2
  const cy     = H * 0.82
  const outerR = Math.min(W * 0.44, H * 0.82)
  const innerR = outerR * 0.7
  const midR   = (outerR + innerR) / 2
  const trackW = outerR - innerR

  ctx.beginPath()
  ctx.arc(cx, cy, midR, Math.PI, 0, false)
  ctx.strokeStyle = '#0a1628'
  ctx.lineWidth = trackW + 2
  ctx.lineCap = 'butt'
  ctx.stroke()

  const segs = [
    [0, 0.2, '#22c55e'], [0.2, 0.4, '#84cc16'], [0.4, 0.6, '#eab308'],
    [0.6, 0.8, '#f97316'], [0.8, 1.0, '#ef4444'],
  ]
  const ratio = score / 100
  for (const [s, e, col] of segs) {
    if (ratio <= s) break
    ctx.beginPath()
    ctx.arc(cx, cy, midR, Math.PI + s * Math.PI, Math.PI + Math.min(ratio, e) * Math.PI, false)
    ctx.strokeStyle = col
    ctx.lineWidth = trackW
    ctx.lineCap = 'butt'
    ctx.stroke()
  }

  const level   = getPanicLevel(score)
  const glowAng = Math.PI + ratio * Math.PI
  const glowX   = cx + midR * Math.cos(glowAng)
  const glowY   = cy + midR * Math.sin(glowAng)
  const grd     = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, trackW * 2)
  grd.addColorStop(0, level.color + 'aa')
  grd.addColorStop(1, level.color + '00')
  ctx.beginPath()
  ctx.arc(glowX, glowY, trackW * 2, 0, 2 * Math.PI)
  ctx.fillStyle = grd
  ctx.fill()

  const needleLen = innerR * 0.88
  const baseW     = 5
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(glowAng)
  ctx.beginPath()
  ctx.moveTo(-needleLen, 0)
  ctx.lineTo(14, -baseW / 2)
  ctx.lineTo(14,  baseW / 2)
  ctx.closePath()
  ctx.fillStyle = '#22d3ee'
  ctx.shadowColor = 'rgba(6,182,212,0.5)'
  ctx.shadowBlur = 6
  ctx.fill()
  ctx.restore()

  ctx.beginPath()
  ctx.arc(cx, cy, trackW * 0.38, 0, 2 * Math.PI)
  ctx.fillStyle = '#06b6d4'
  ctx.shadowBlur = 0
  ctx.fill()
  ctx.beginPath()
  ctx.arc(cx, cy, trackW * 0.22, 0, 2 * Math.PI)
  ctx.fillStyle = '#030711'
  ctx.fill()

  ctx.font = `bold ${Math.round(trackW * 0.55)}px system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ;['0', '25', '50', '75', '100'].forEach((lbl, i) => {
    const ang = Math.PI + (i / 4) * Math.PI
    const r1 = outerR + 6, r2 = outerR + 14, rL = outerR + 22
    ctx.beginPath()
    ctx.moveTo(cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang))
    ctx.lineTo(cx + r2 * Math.cos(ang), cy + r2 * Math.sin(ang))
    ctx.strokeStyle = 'rgba(6,182,212,0.35)'
    ctx.lineWidth = 1.5
    ctx.stroke()
    ctx.fillStyle = '#7a9abb'
    ctx.fillText(lbl, cx + rL * Math.cos(ang), cy + rL * Math.sin(ang))
  })

  const zoneLbls = [
    [0.1, '乐观'], [0.3, '中性'], [0.5, '担忧'], [0.7, '恐慌'], [0.9, '极恐'],
  ]
  ctx.font = `600 ${Math.round(trackW * 0.42)}px system-ui`
  ctx.fillStyle = 'rgba(8,17,27,.85)'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const [r, txt] of zoneLbls) {
    const ang = Math.PI + r * Math.PI
    ctx.fillText(txt, cx + midR * Math.cos(ang), cy + midR * Math.sin(ang))
  }
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]))
}

export function mdToHtml(text) {
  let h = escapeHtml(text)
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  return h.split(/\n\n+/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('')
}
