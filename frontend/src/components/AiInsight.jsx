import { getPanicLevel, fmtPrice } from '../lib/utils.js'

export default function AiInsight({ quotes, analyticsData, panicScore, onAskOpen, bare }) {
  const level = getPanicLevel(panicScore)
  const m = analyticsData?.market
  const vix = quotes['^VIX']
  const nq  = quotes['^IXIC']
  const sp  = quotes['^GSPC']
  const breadth = m?.breadth
  const corr    = m?.avgCorr

  const lines = []
  if (vix) {
    lines.push(`VIX ${fmtPrice(vix.price, '')}，${vix.pct >= 0 ? '上升' : '回落'} ${Math.abs(vix.pct).toFixed(2)}%，反映波动预期${vix.pct >= 0 ? '抬升' : '降温'}。`)
  }
  if (nq && sp) {
    lines.push(`纳指 ${nq.pct >= 0 ? '上涨' : '下跌'} ${Math.abs(nq.pct).toFixed(2)}%，标普500 ${sp.pct >= 0 ? '上涨' : '下跌'} ${Math.abs(sp.pct).toFixed(2)}%，科技权重仍是主要观察点。`)
  }
  if (breadth) {
    const weak = breadth.down > breadth.up
    lines.push(`市场宽度 ${breadth.up} 涨 / ${breadth.down} 跌，${weak ? '短线抛压偏广，优先看支撑位' : '上涨家数占优，恐慌扩散暂未放大'}。`)
  }
  if (corr != null) {
    lines.push(`平均相关性 ${corr}，${corr > 0.7 ? '抱团下跌风险较高' : corr > 0.45 ? '联动中等，适合分板块观察' : '分化明显，个股逻辑更重要'}。`)
  }

  return (
    <section className={`ai-insight-section${bare ? ' bare' : ''}`} id="sec-ai-insight">
      {!bare && (
        <div className="ai-insight-head">
          <div>
            <h2>AI 市场洞察</h2>
            <p>基于当前页面数据分析</p>
          </div>
          <span className="beta-badge">BETA</span>
        </div>
      )}
      <div className="ai-regime">
        <span>市场情绪</span>
        <strong style={{ color: level.color }}>{level.label} · {panicScore ?? '--'}</strong>
      </div>
      <div className="ai-brief">
        {lines.length === 0
          ? <div className="brief-line">正在读取恐慌指数、VIX、市场宽度与主要指数。</div>
          : lines.slice(0, 4).map((line, i) => <div key={i} className="brief-line">{line}</div>)
        }
      </div>
      <button className="ai-inline-ask" type="button" onClick={onAskOpen}>
        向 AI 提问市场走势、个股分析或策略建议...
      </button>
      <div className="ai-foot">深度思考 · 联网搜索</div>
    </section>
  )
}
