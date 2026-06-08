import { getPanicLevel, fmtPrice } from '../lib/utils.js'
import { CN_NAMES } from '../lib/constants.js'
import Watchlist from './Watchlist.jsx'
import ChartSection from './ChartSection.jsx'
import StockDetail from './StockDetail.jsx'
import RankingTables from './RankingTables.jsx'

function Ticker({ sym, q, onClick }) {
  if (!q) return null
  const up = (q.pct ?? 0) >= 0
  const sgn = up ? '+' : ''
  return (
    <button className="tm-ticker" onClick={onClick} disabled={!onClick}>
      <span className="tm-ticker-name">{CN_NAMES[sym] || sym}</span>
      <span className={`tm-ticker-val ${up ? 'positive' : 'negative'}`}>{fmtPrice(q.price, '')}</span>
      <span className={`tm-ticker-chg ${up ? 'positive' : 'negative'}`}>{sgn}{q.pct?.toFixed(2)}%</span>
    </button>
  )
}

export default function Terminal({
  quotes, quoteData, analyticsData, panicScore,
  selectedSym, onSelectSym, selectedPeriod, onPeriodChange, onAskAI, onContextStock,
}) {
  const level = getPanicLevel(panicScore)
  const selQuote = quotes[selectedSym]

  return (
    <section id="terminal" className="terminal">
      {/* 市场状态条：恐慌分 + 指数 */}
      <div className="tm-strip">
        <div className="tm-panic" style={{ '--lvl': level.color }}>
          <span className="tm-panic-lbl">恐慌指数</span>
          <span className="tm-panic-num" style={{ color: level.color }}>{panicScore}</span>
          <span className="tm-panic-level" style={{ color: level.color }}>{level.label}</span>
        </div>
        <div className="tm-tickers">
          <Ticker sym="^IXIC" q={quotes['^IXIC']} onClick={() => onSelectSym('^IXIC')} />
          <Ticker sym="^GSPC" q={quotes['^GSPC']} onClick={() => onSelectSym('^GSPC')} />
          <Ticker sym="^VIX"  q={quotes['^VIX']}  onClick={() => onSelectSym('^VIX')} />
        </div>
      </div>

      {/* 三栏：自选 | K线 | 个股详情 */}
      <div className="tm-grid">
        <div className="tm-left">
          <Watchlist quotes={quotes} selectedSym={selectedSym} onSelect={onSelectSym} onContext={onContextStock} />
        </div>
        <div className="tm-center">
          <ChartSection
            selectedSym={selectedSym}
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
            quoteData={quoteData}
            analyticsData={analyticsData}
          />
        </div>
        <div className="tm-right">
          <StockDetail sym={selectedSym} quote={selQuote} analytics={analyticsData} onAskAI={onAskAI} />
        </div>
      </div>

      {/* 底部排行榜 */}
      <RankingTables quotes={quotes} selectedSym={selectedSym} onSelect={onSelectSym} onContext={onContextStock} />
    </section>
  )
}
