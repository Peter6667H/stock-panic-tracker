import { getPanicLevel, fmtPrice, fmtChg } from '../lib/utils.js'
import { useCountUp } from '../lib/hooks.js'
import PanicGauge from './PanicGauge.jsx'

function Readout({ label, value, chg, cls, onClick }) {
  return (
    <button className="hero-readout" onClick={onClick} disabled={!onClick}>
      <span className="hero-readout-label">{label}</span>
      <span className="hero-readout-val">{value}</span>
      {chg && <span className={`hero-readout-chg ${cls}`}>{chg}</span>}
    </button>
  )
}

export default function Hero({ quotes, panicScore, onSelectSym, onJump }) {
  const level = getPanicLevel(panicScore)
  const display = useCountUp(panicScore)

  const vix = quotes['^VIX']
  const nq  = quotes['^IXIC']
  const sp  = quotes['^GSPC']
  const vChg = vix ? fmtChg(vix.change, vix.pct) : null
  const nChg = nq ? fmtChg(nq.change, nq.pct) : null
  const sChg = sp ? fmtChg(sp.change, sp.pct) : null

  return (
    <section id="hero" className="hero">
      <div className="hero-aura" aria-hidden />
      <div className="hero-grid" aria-hidden />

      <div className="hero-inner">
        <div className="hero-copy">
          <div className="hero-eyebrow">// 实时美股市场情绪监控</div>
          <h1 className="hero-title">
            今天，市场<br /><span className="hero-title-accent">恐慌</span>了吗？
          </h1>
          <p className="hero-sub">
            综合 VIX、市场宽度、回撤、波动、动量等多因子，把美股恐慌程度
            量化成一个 <span className="hero-sub-em">0–100</span> 的实时分数。
            暴跌时，先看分数，再做决定。
          </p>
          <div className="hero-actions">
            <button className="hero-btn primary" onClick={() => onJump('overview')}>
              查看市场详情 <span className="hero-btn-arrow">↓</span>
            </button>
            <button className="hero-btn ghost" onClick={() => onJump('ai')}>
              问 AI 解读 ✦
            </button>
          </div>
        </div>

        <div className="hero-stage">
          <div className="hero-gauge-frame">
            <span className="hud-corner tl" /><span className="hud-corner tr" />
            <span className="hud-corner bl" /><span className="hud-corner br" />
            <div className="hero-gauge">
              <PanicGauge score={panicScore} />
              <div className="hero-gauge-center">
                <div className="hero-score" style={{ color: level.color }}>
                  {display === null ? '--' : display}
                </div>
                <div className="hero-level" style={{ color: level.color }}>{level.label}</div>
                <div className="hero-level-desc">{level.desc}</div>
              </div>
            </div>
          </div>

          <div className="hero-readouts">
            <Readout
              label="VIX 波动率"
              value={vix ? fmtPrice(vix.price, '') : '--'}
              chg={vChg?.text} cls={vChg?.cls}
            />
            <Readout
              label="纳斯达克"
              value={nq ? fmtPrice(nq.price, '') : '--'}
              chg={nChg?.text} cls={nChg?.cls}
              onClick={() => onSelectSym('^IXIC')}
            />
            <Readout
              label="标普 500"
              value={sp ? fmtPrice(sp.price, '') : '--'}
              chg={sChg?.text} cls={sChg?.cls}
              onClick={() => onSelectSym('^GSPC')}
            />
          </div>
        </div>
      </div>

      <button className="hero-scrollcue" onClick={() => onJump('overview')} aria-label="向下滚动">
        <span>下滑探索</span>
        <span className="hero-scrollcue-line" />
      </button>
    </section>
  )
}
