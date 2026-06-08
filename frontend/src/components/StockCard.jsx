import { CN_NAMES } from '../lib/constants.js'
import { fmtPrice } from '../lib/utils.js'
import { useFlashOnChange } from '../lib/hooks.js'

function Sparkline({ data, up }) {
  if (!data || data.length < 2) return <div className="mm-spark-placeholder" />
  const min = Math.min(...data), max = Math.max(...data)
  const range = max - min || min * 0.01 || 1
  const W = 72, H = 32, px = 2
  const pts = data.map((v, i) => {
    const x = px + (i / (data.length - 1)) * (W - px * 2)
    const y = (H - px) - ((v - min) / range) * (H - px * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  }).join(' ')
  const color = up ? 'var(--green)' : 'var(--red)'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mm-spark-svg" aria-hidden>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5"
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export default function StockCard({ sym, q, selected, onSelect, sparkData }) {
  const flashKey = useFlashOnChange(q?.price)
  const displaySym = sym.replace('^', '')
  const name = CN_NAMES[sym] || (q?.name || sym)
  const shortName = name.length > 16 ? name.slice(0, 15) + '…' : name

  if (!q) {
    return (
      <div className="stock-card" onClick={() => onSelect(sym)}>
        <div className="mm-left">
          <span className="card-sym">{displaySym}</span>
          <span className="card-name">—</span>
        </div>
        <div className="mm-spark"><div className="mm-spark-placeholder" /></div>
        <div className="mm-right">
          <span className="card-price muted">--</span>
        </div>
      </div>
    )
  }

  const up      = q.pct >= 0
  const dirCls  = up ? 'up' : 'down'
  const pctSign = up ? '+' : ''
  const pctText = `${pctSign}${q.pct?.toFixed(2) ?? '--'}%`

  return (
    <div
      className={`stock-card ${dirCls}${selected ? ' selected' : ''}`}
      onClick={() => onSelect(sym)}
    >
      <div className="mm-left">
        <span className="card-sym">{displaySym}</span>
        <span className="card-name">{shortName}</span>
      </div>

      <div className="mm-spark">
        <Sparkline data={sparkData} up={up} />
      </div>

      <div className="mm-right" key={flashKey}>
        <span className={`card-price hud-flash ${up ? 'positive' : 'negative'}`}>
          {fmtPrice(q.price)}
        </span>
        <span className={`mm-badge ${up ? 'mm-badge-up' : 'mm-badge-dn'}`}>
          {pctText}
        </span>
      </div>
    </div>
  )
}
