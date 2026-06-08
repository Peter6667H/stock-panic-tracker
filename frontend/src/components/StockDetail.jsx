import { CN_NAMES, SECTORS } from '../lib/constants.js'
import { fmtPrice, fmtVol, fmtMktCap, rangePos } from '../lib/utils.js'

function Cell({ label, value, cls }) {
  return (
    <div className="td-cell">
      <span className="td-cell-lbl">{label}</span>
      <span className={`td-cell-val ${cls || ''}`}>{value}</span>
    </div>
  )
}

export default function StockDetail({ sym, quote: q, analytics, onAskAI }) {
  const code = sym?.replace('^', '') || '--'
  const name = CN_NAMES[sym] || q?.name || sym
  const sector = SECTORS[sym] || ''

  if (!q) {
    return (
      <div className="stock-detail">
        <div className="td-head">
          <div className="td-code">{code}</div>
          <div className="td-name">{name}</div>
        </div>
        <div className="td-loading">载入个股数据…</div>
      </div>
    )
  }

  const up = (q.pct ?? 0) >= 0
  const cur = (q.currency || 'USD') === 'USD' ? '$' : ''
  const sgn = up ? '+' : ''
  const amp = q.prevClose ? ((q.dayHigh - q.dayLow) / q.prevClose * 100) : null
  const volR = q.avgVol > 0 ? (q.volume / q.avgVol).toFixed(2) + 'x' : '--'
  const dayPos = (q.dayHigh > q.dayLow)
    ? Math.round((q.price - q.dayLow) / (q.dayHigh - q.dayLow) * 100) : 50
  const wPos = rangePos(q.price, q.low52, q.high52)
  const a = analytics?.stocks?.[sym]

  return (
    <div className="stock-detail">
     <div className="td-scroll">
      {/* 头部：代码 名称 板块 + 大价格 */}
      <div className="td-head">
        <div className="td-head-top">
          <span className="td-code">{code}</span>
          {sector && <span className="td-sector">{sector}</span>}
        </div>
        <div className="td-name">{name}</div>
        <div className="td-price-row">
          <span className={`td-price ${up ? 'positive' : 'negative'}`}>{fmtPrice(q.price, cur)}</span>
          <span className={`td-badge ${up ? 'td-up' : 'td-dn'}`}>
            {sgn}{q.change?.toFixed(2)} ({sgn}{q.pct?.toFixed(2)}%)
          </span>
        </div>
      </div>

      {/* 盘口替代：日内位置 + 52周位置（Yahoo 无 L2 五档） */}
      <div className="td-bars">
        <div className="td-bar-row">
          <span className="td-bar-lbl">日内 {fmtPrice(q.dayLow, cur)} ~ {fmtPrice(q.dayHigh, cur)}</span>
          <div className="td-bar"><div className="td-bar-fill" style={{ width: `${dayPos}%` }} /></div>
          <span className="td-bar-val">{dayPos}%</span>
        </div>
        <div className="td-bar-row">
          <span className="td-bar-lbl">52周 {fmtPrice(q.low52, cur)} ~ {fmtPrice(q.high52, cur)}</span>
          <div className="td-bar"><div className="td-bar-fill w52" style={{ width: `${wPos}%` }} /></div>
          <span className="td-bar-val">{wPos}%</span>
        </div>
      </div>

      {/* 指标网格 */}
      <div className="td-grid">
        <Cell label="今开" value={fmtPrice(q.open, cur)} cls={q.open >= q.prevClose ? 'positive' : 'negative'} />
        <Cell label="昨收" value={fmtPrice(q.prevClose, cur)} />
        <Cell label="最高" value={fmtPrice(q.dayHigh, cur)} cls="positive" />
        <Cell label="最低" value={fmtPrice(q.dayLow, cur)} cls="negative" />
        <Cell label="涨跌" value={`${sgn}${q.change?.toFixed(2)}`} cls={up ? 'positive' : 'negative'} />
        <Cell label="振幅" value={amp != null ? amp.toFixed(2) + '%' : '--'} />
        <Cell label="成交量" value={fmtVol(q.volume)} />
        <Cell label="量比" value={volR} cls={parseFloat(volR) > 2 ? 'negative' : ''} />
        <Cell label="市值" value={fmtMktCap(q.mktCap)} />
        <Cell label="52周高" value={fmtPrice(q.high52, cur)} />
        <Cell label="52周低" value={fmtPrice(q.low52, cur)} />
        <Cell label="状态" value={q.state === 'REGULAR' ? '交易中' : q.state === 'CLOSED' ? '已收盘' : q.state} />
      </div>

      {/* 风险指标（来自 analytics） */}
      {a && (
        <div className="td-risk">
          <div className="td-risk-title">风险指标</div>
          <div className="td-grid">
            <Cell label="Beta" value={a.beta ?? '--'} cls={a.beta > 1.2 ? 'negative' : a.beta < 0 ? 'positive' : ''} />
            <Cell label="HV20" value={(a.hv20 ?? '--') + '%'} />
            <Cell label="当前回撤" value={(a.curDD ?? '--') + '%'} cls="negative" />
            <Cell label="最大回撤" value={(a.maxDD ?? '--') + '%'} cls="negative" />
            <Cell label="VaR95" value={(a.var95 ?? '--') + '%'} cls="negative" />
            <Cell label="距MA200" value={(a.priceVs200 >= 0 ? '+' : '') + (a.priceVs200 ?? '--') + '%'} cls={a.priceVs200 >= 0 ? 'positive' : 'negative'} />
            <Cell label="ATR" value={(a.atrPct ?? '--') + '%'} />
            <Cell label="连涨跌" value={a.streak != null ? (a.streak > 0 ? `+${a.streak}天` : `${a.streak}天`) : '--'} cls={a.streak > 0 ? 'positive' : a.streak < 0 ? 'negative' : ''} />
          </div>
        </div>
      )}

     </div>

      {/* AI 深度分析按钮 —— 固定底部，永不被截断 */}
      <div className="td-foot">
        <button className="td-ai-btn" onClick={() => onAskAI(sym)}>
          <span className="td-ai-spark">✦</span> DeepSeek 深度分析 {code}
          <span className="td-ai-arrow">→</span>
        </button>
        <div className="td-ai-hint">基于实时行情 + 个股新闻，用大白话讲清这只票</div>
      </div>
    </div>
  )
}
