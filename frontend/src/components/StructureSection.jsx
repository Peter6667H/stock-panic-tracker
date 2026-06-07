export default function StructureSection({ analyticsData, bare }) {
  const m = analyticsData?.market
  const b = m?.breadth
  const corr = m?.avgCorr
  const hv = m?.marketHV
  const vix = m?.vix

  const corrClass = corr > 0.7 ? 'negative' : corr > 0.45 ? 'neutral' : 'positive'
  const corrHint = corr > 0.7
    ? '高度抱团，系统性下跌风险大'
    : corr > 0.45 ? '中度相关，部分联动' : '分化明显，个股逻辑主导'

  const prem = vix != null && hv != null ? +(vix - hv).toFixed(1) : null
  const hvHint = prem != null
    ? prem >= 0
      ? `VIX溢价 +${prem}：预期波动高于实际，留有缓冲`
      : `实际波动已超预期 ${prem}：风险或被低估`
    : '趋近1 = 齐涨齐跌(系统性风险)'

  const grid = (
      <div className="structure-grid">
        <div className="struct-card">
          <div className="struct-label">市场宽度 · 上涨家数</div>
          <div className="struct-main">{b ? `${b.up} 涨 / ${b.down} 跌` : '--'}</div>
          {b && (
            <div className="breadth-bar">
              <div className="breadth-up" style={{ width: (b.total ? b.up / b.total * 100 : 0) + '%' }} />
              <div className="breadth-down" style={{ width: (b.total ? b.down / b.total * 100 : 0) + '%' }} />
            </div>
          )}
          <div className="struct-hint">{b ? `${b.upPct}% 上涨 · ${b.flat} 只持平` : '普跌(齐跌)=系统性恐慌'}</div>
        </div>

        <div className="struct-card">
          <div className="struct-label">52周 新高 / 新低</div>
          <div className="struct-main">
            <span className="positive">{m?.newHigh ?? '--'}</span>
            <span className="muted"> / </span>
            <span className="negative">{m?.newLow ?? '--'}</span>
          </div>
          <div className="struct-hint">创新低家数飙升 = 恐慌扩散</div>
        </div>

        <div className="struct-card">
          <div className="struct-label">平均相关性 · 抱团度</div>
          <div className={`struct-main ${corrClass}`}>{corr ?? '--'}</div>
          <div className="struct-hint">{corrHint}</div>
        </div>

        <div className="struct-card">
          <div className="struct-label">实际波动 HV vs 预期 VIX</div>
          <div className="struct-main">
            <span>{hv != null ? hv + '%' : '--'}</span>
            <span className="muted"> vs </span>
            <span>{vix != null ? vix.toFixed(1) : '--'}</span>
          </div>
          <div className="struct-hint">{hvHint}</div>
        </div>
      </div>
  )

  if (bare) return <div className="struct-block" id="sec-structure">{grid}</div>

  return (
    <section className="stock-section" id="sec-structure">
      <h2 className="section-title">
        <span className="section-icon">🧭</span> 市场结构与情绪
        <span className="section-sub">计算衍生指标</span>
      </h2>
      {grid}
    </section>
  )
}
