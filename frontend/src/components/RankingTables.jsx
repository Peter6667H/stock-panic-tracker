import { SYMBOLS, CN_NAMES } from '../lib/constants.js'
import { fmtPrice } from '../lib/utils.js'

// 排行只看可交易标的（剔除指数）
const UNIVERSE = [...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech]

function buildRows(quotes) {
  return UNIVERSE.map(sym => {
    const q = quotes[sym]
    if (!q) return null
    const amp = q.prevClose ? (q.dayHigh - q.dayLow) / q.prevClose * 100 : 0
    const volR = q.avgVol > 0 ? q.volume / q.avgVol : 0
    return { sym, code: sym.replace('^', ''), name: CN_NAMES[sym] || q.name || sym,
      price: q.price, pct: q.pct ?? 0, cur: (q.currency || 'USD') === 'USD' ? '$' : '', amp, volR }
  }).filter(Boolean)
}

function Board({ title, rows, metric, fmtMetric, selectedSym, onSelect, onContext }) {
  return (
    <div className="rk-board">
      <div className="rk-title">{title}</div>
      <div className="rk-rows">
        {rows.map((r, i) => (
          <div key={r.sym} className={`rk-row${selectedSym === r.sym ? ' selected' : ''}`}
            onClick={() => onSelect(r.sym)} onContextMenu={e => onContext?.(r.sym, e)}>
            <span className="rk-idx">{i + 1}</span>
            <span className="rk-name"><b>{r.code}</b><em>{r.name}</em></span>
            <span className="rk-price">{fmtPrice(r.price, r.cur)}</span>
            <span className={`rk-metric ${metric(r) >= 0 ? 'positive' : 'negative'}`}>{fmtMetric(r)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function RankingTables({ quotes, selectedSym, onSelect, onContext }) {
  const rows = buildRows(quotes)
  if (!rows.length) return null

  const gainers = [...rows].sort((a, b) => b.pct - a.pct).slice(0, 6)
  const losers  = [...rows].sort((a, b) => a.pct - b.pct).slice(0, 6)
  const active  = [...rows].sort((a, b) => b.volR - a.volR).slice(0, 6)
  const ampers  = [...rows].sort((a, b) => b.amp - a.amp).slice(0, 6)

  const pctFmt = r => `${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%`

  return (
    <div className="rankings">
      <Board title="涨幅榜" rows={gainers} metric={r => r.pct} fmtMetric={pctFmt} selectedSym={selectedSym} onSelect={onSelect} onContext={onContext} />
      <Board title="跌幅榜" rows={losers} metric={r => r.pct} fmtMetric={pctFmt} selectedSym={selectedSym} onSelect={onSelect} onContext={onContext} />
      <Board title="量比榜 · 资金活跃" rows={active} metric={r => 1} fmtMetric={r => r.volR.toFixed(2) + 'x'} selectedSym={selectedSym} onSelect={onSelect} onContext={onContext} />
      <Board title="振幅榜 · 日内波动" rows={ampers} metric={r => 1} fmtMetric={r => r.amp.toFixed(2) + '%'} selectedSym={selectedSym} onSelect={onSelect} onContext={onContext} />
    </div>
  )
}
