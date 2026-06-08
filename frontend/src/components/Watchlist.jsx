import { SYMBOLS, CN_NAMES, SECTORS } from '../lib/constants.js'
import { fmtPrice } from '../lib/utils.js'
import { useFlashOnChange } from '../lib/hooks.js'

const GROUPS = [
  { key: 'indices', label: '指数 · 大盘' },
  { key: 'etfs',    label: '杠杆 ETF' },
  { key: 'mag7',    label: '科技七姐妹' },
  { key: 'tech',    label: '半导体' },
]

function Row({ sym, q, selected, onSelect }) {
  const flashKey = useFlashOnChange(q?.price)
  const code = sym.replace('^', '')
  const name = CN_NAMES[sym] || q?.name || sym
  const sector = SECTORS[sym] || ''

  if (!q) {
    return (
      <div className="wl-row" onClick={() => onSelect(sym)}>
        <div className="wl-name"><span className="wl-code">{code}</span><span className="wl-cn">{name}</span></div>
        <div className="wl-num muted">--</div>
      </div>
    )
  }

  const up = (q.pct ?? 0) >= 0
  const sgn = up ? '+' : ''
  const cur = (q.currency || 'USD') === 'USD' ? '$' : ''

  return (
    <div className={`wl-row ${up ? 'up' : 'dn'}${selected ? ' selected' : ''}`} onClick={() => onSelect(sym)}>
      <div className="wl-name">
        <span className="wl-code">{code}</span>
        <span className="wl-cn">{name}{sector && <em className="wl-sector">{sector}</em>}</span>
      </div>
      <div key={flashKey} className="wl-right hud-flash">
        <span className={`wl-price ${up ? 'positive' : 'negative'}`}>{fmtPrice(q.price, cur)}</span>
        <span className={`wl-badge ${up ? 'wl-up' : 'wl-dn'}`}>{sgn}{q.pct?.toFixed(2)}%</span>
      </div>
    </div>
  )
}

export default function Watchlist({ quotes, selectedSym, onSelect }) {
  return (
    <div className="watchlist">
      <div className="wl-header">
        <span className="wl-h-title">自选 · 全市场</span>
        <span className="wl-h-cols"><span>最新</span><span>涨跌幅</span></span>
      </div>
      <div className="wl-body">
        {GROUPS.map(g => (
          <div key={g.key} className="wl-group">
            <div className="wl-group-label">{g.label}</div>
            {SYMBOLS[g.key].map(sym => (
              <Row key={sym} sym={sym} q={quotes[sym]} selected={selectedSym === sym} onSelect={onSelect} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
