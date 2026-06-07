export default function LeverageSection({ analyticsData, bare }) {
  const lv = analyticsData?.leverage
  if (!lv) return null

  const card = (sym, desc, d, qqqRet) => {
    const maxAbs = Math.max(Math.abs(d.actual), Math.abs(d.theory), Math.abs(qqqRet), 1)
    const bar = (label, val, color) => (
      <div key={label} className="lev-bar-row">
        <span className="lev-bar-label">{label}</span>
        <div className="lev-bar-track">
          <div className="lev-bar-fill" style={{ width: `${Math.abs(val) / maxAbs * 100}%`, background: color }} />
        </div>
        <span className="lev-bar-val" style={{ color }}>{val >= 0 ? '+' : ''}{val}%</span>
      </div>
    )
    const excess = +(-d.decay).toFixed(1)
    const good = excess >= 0
    return (
      <div key={sym} className="lev-card">
        <div className="lev-head">
          <span className="lev-sym">{sym}</span>
          <span className="lev-desc">{desc}</span>
        </div>
        <div className="lev-bars">
          {bar('QQQ 实际', qqqRet, qqqRet >= 0 ? 'var(--green)' : 'var(--red)')}
          {bar('理论 ×3', d.theory, 'var(--blue)')}
          {bar('实际表现', d.actual, d.actual >= 0 ? 'var(--green)' : 'var(--red)')}
        </div>
        <div className="lev-decay">
          <span>{good ? '跑赢理论倍数(复利增益)' : '波动损耗(跑输理论)'}</span>
          <span className="lev-decay-val" style={{ color: good ? 'var(--green)' : 'var(--orange)' }}>
            {good ? '+' : ''}{excess}%
          </span>
        </div>
      </div>
    )
  }

  const body = (
    <>
      <div className="leverage-grid">
        {lv.tqqq && card('TQQQ', '3倍做多 QQQ', lv.tqqq, lv.qqqRet1y)}
        {lv.sqqq && card('SQQQ', '3倍做空 QQQ', lv.sqqq, lv.qqqRet1y)}
      </div>
      <p className="lev-note">说明：杠杆ETF每日复利+再平衡，单边上涨时可能跑赢理论倍数（正向复利），震荡市则产生<strong>波动损耗(衰减)</strong>。长期持有需警惕。</p>
    </>
  )

  if (bare) {
    return (
      <div className="lev-block" id="sec-leverage">
        <div className="block-label"><span>杠杆 ETF 衰减</span><em>近一年 · 实际 vs 理论倍数</em></div>
        {body}
      </div>
    )
  }

  return (
    <section className="stock-section" id="sec-leverage">
      <h2 className="section-title">
        <span className="section-icon">⚠️</span> 杠杆ETF衰减分析
        <span className="section-sub">近一年 · 实际 vs 理论倍数</span>
      </h2>
      {body}
    </section>
  )
}
