import { getPanicLevel, fmtPrice, fmtChg, scaleColor } from '../lib/utils.js'
import PanicGauge from './PanicGauge.jsx'

function StatMiniCard({ label, children, hint, onClick, selected }) {
  return (
    <div className={`stat-card${onClick ? ' clickable' : ''}${selected ? ' selected' : ''}`} onClick={onClick}>
      <div className="stat-label">{label}</div>
      {children}
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  )
}

export default function PanicSection({ quotes, analyticsData, panicScore, selectedSym, onSelectSym }) {
  const level = getPanicLevel(panicScore)
  const factors = analyticsData?.market?.panicFactors
  const factorItems = factors
    ? [['VIX', factors.vix], ['宽度', factors.breadth], ['回撤', factors.drawdown], ['波动', factors.hv], ['新低', factors.newLow], ['动量', factors.momentum]]
    : []

  const vix = quotes['^VIX']
  const vChg = vix ? fmtChg(vix.change, vix.pct) : null

  const nq = quotes['^IXIC']
  const nChg = nq ? fmtChg(nq.change, nq.pct) : null

  const sp = quotes['^GSPC']
  const sChg = sp ? fmtChg(sp.change, sp.pct) : null

  return (
    <section className="panic-section" id="sec-panic">
      <div className="gauge-card">
        <div className="card-title">恐慌指数</div>
        <div className="gauge-wrap">
          <PanicGauge score={panicScore} />
          <div className="gauge-center">
            <div className="panic-score" style={{ color: level.color }}>{panicScore === null ? '--' : panicScore}</div>
            <div className="panic-label" style={{ color: level.color }}>{level.label}</div>
          </div>
        </div>
        <p className="panic-desc">{level.desc}</p>
        {factorItems.length > 0 && (
          <div className="panic-factors">
            {factorItems.map(([name, val]) => (
              <div key={name} className="pf-row">
                <span className="pf-name">{name}</span>
                <div className="pf-bar">
                  <div className="pf-fill" style={{ width: `${val}%`, background: scaleColor(val) }} />
                </div>
                <span className="pf-val">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="side-stats">
        <StatMiniCard label="VIX 恐慌指数" hint="15以下平静 · 30以上恐慌 · 40以上极恐">
          {vix && (
            <>
              <div className={`stat-val ${vix.price > 30 ? 'negative' : vix.price < 18 ? 'positive' : 'neutral'}`}>
                {fmtPrice(vix.price, '')}
              </div>
              <div className={`stat-chg ${vChg.cls}`}>{vChg.text}</div>
            </>
          )}
          {!vix && <div className="stat-val">--</div>}
        </StatMiniCard>

        <StatMiniCard
          label="NASDAQ 综合"
          hint={nq ? `开 ${fmtPrice(nq.open, '')} · 日高 ${fmtPrice(nq.dayHigh, '')} · 日低 ${fmtPrice(nq.dayLow, '')}` : '--'}
          onClick={() => onSelectSym('^IXIC')}
          selected={selectedSym === '^IXIC'}
        >
          {nq && (
            <>
              <div className="stat-val">{fmtPrice(nq.price, '')}</div>
              <div className={`stat-chg ${nChg.cls}`}>{nChg.text}</div>
            </>
          )}
          {!nq && <div className="stat-val">--</div>}
        </StatMiniCard>

        <StatMiniCard
          label="S&P 500"
          hint={sp ? `开 ${fmtPrice(sp.open, '')} · 日高 ${fmtPrice(sp.dayHigh, '')} · 日低 ${fmtPrice(sp.dayLow, '')}` : '--'}
          onClick={() => onSelectSym('^GSPC')}
          selected={selectedSym === '^GSPC'}
        >
          {sp && (
            <>
              <div className="stat-val">{fmtPrice(sp.price, '')}</div>
              <div className={`stat-chg ${sChg.cls}`}>{sChg.text}</div>
            </>
          )}
          {!sp && <div className="stat-val">--</div>}
        </StatMiniCard>
      </div>
    </section>
  )
}
