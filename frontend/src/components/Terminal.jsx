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

      {/* ① 顶部数据条：恐慌分 + 关键指数 */}
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
          <Ticker sym="QQQ"   q={quotes['QQQ']}   onClick={() => onSelectSym('QQQ')} />
          <Ticker sym="TQQQ"  q={quotes['TQQQ']}  onClick={() => onSelectSym('TQQQ')} />
        </div>
      </div>

      {/* ② 自选横条：水平滚动 ticker strip */}
      <div className="tm-watchstrip-outer">
        <Watchlist
          quotes={quotes}
          selectedSym={selectedSym}
          onSelect={onSelectSym}
          onContext={onContextStock}
          mode="strip"
        />
      </div>

      {/* ③ 主区：全宽大图 */}
      <div className="tm-main-area">
        <div className="tm-chart-panel">
          <ChartSection
            selectedSym={selectedSym}
            selectedPeriod={selectedPeriod}
            onPeriodChange={onPeriodChange}
            quoteData={quoteData}
            analyticsData={analyticsData}
          />
        </div>
      </div>

      {/* ④ 底部网格：个股详情 + 3 排行榜 */}
      <div className="tm-bottom-grid">
        <div className="tm-bottom-card tm-detail-card">
          <StockDetail sym={selectedSym} quote={selQuote} analytics={analyticsData} onAskAI={onAskAI} />
        </div>
        <RankingTables quotes={quotes} selectedSym={selectedSym} onSelect={onSelectSym} onContext={onContextStock} />
      </div>

    </section>
  )
}
