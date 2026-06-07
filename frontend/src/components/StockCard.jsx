import { CN_NAMES } from '../lib/constants.js'
import { fmtPrice, fmtChg, fmtVol, rangePos } from '../lib/utils.js'
import { useFlashOnChange } from '../lib/hooks.js'

export default function StockCard({ sym, q, selected, onSelect }) {
  const flashKey = useFlashOnChange(q?.price)
  if (!q) {
    return (
      <div className="stock-card" onClick={() => onSelect(sym)}>
        <div className="card-sym">{sym.replace('^', '')}</div>
        <div className="card-price muted">--</div>
      </div>
    )
  }

  const chg    = fmtChg(q.change, q.pct)
  const rPos   = rangePos(q.price, q.low52, q.high52)
  const volRaw = q.avgVol > 0 ? q.volume / q.avgVol : 0
  const volR   = volRaw.toFixed(2) + 'x'
  const volCls = volRaw > 3 ? 'very-high' : volRaw > 2 ? 'high' : ''
  const dirCls = q.pct >= 0 ? 'up' : 'down'

  return (
    <div
      className={`stock-card ${dirCls}${selected ? ' selected' : ''}`}
      onClick={() => onSelect(sym)}
    >
      <div className="card-sym">{sym.replace('^', '')}</div>
      <div className="card-name">{CN_NAMES[sym] || q.name}</div>
      <div key={flashKey} className={`card-price hud-flash ${chg.cls}`}>{fmtPrice(q.price)}</div>
      <div className={`card-chg ${chg.cls}`}>{chg.text}</div>
      <div className="card-footer">
        <div className="range-bar-wrap">
          <span>52W</span>
          <div className="range-bar"><div className="range-fill" style={{ width: `${rPos}%` }} /></div>
          <span>{rPos}%</span>
        </div>
        <div className="vol-row">
          <span>成交量 {fmtVol(q.volume)}</span>
          <span className={`vol-ratio ${volCls}`}>均量{volR}</span>
        </div>
      </div>
    </div>
  )
}
