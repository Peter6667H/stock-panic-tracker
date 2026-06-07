import { useEffect, useMemo, useState } from 'react'
import { getPanicLevel, fmtPrice } from '../lib/utils.js'
import {
  getHoldings, computePersonal, adviceFor, recordSnapshot,
  getHistory, getCommitment, startCommitment, clearCommitment, logDecision,
} from '../lib/portfolio.js'

// 初期社区对标：预设档案（方案里写的初版用模拟数据）
const COMMUNITY = { label: '科技股为主的投资者', avgPanic: 64, actRate: 27, n: '1.2k' }

function hoursLeft(expiry) {
  const ms = expiry - Date.now()
  if (ms <= 0) return 0
  return Math.max(1, Math.round(ms / 3600000))
}

export default function MyPanicSection({ quotes, analytics, marketScore, holdingsVersion, onEdit }) {
  const holdings = getHoldings()
  const p = useMemo(
    () => computePersonal({ holdings, quotes, analytics, marketScore }),
    [holdingsVersion, quotes, analytics, marketScore], // eslint-disable-line
  )
  const advice = adviceFor(p)

  const [commit, setCommit] = useState(getCommitment())
  const [, force] = useState(0)

  // 记录每日快照（用于习惯修正与历史日记）
  useEffect(() => {
    if (p?.personal != null) recordSnapshot(p.personal, p.market)
  }, [p?.personal, p?.market])

  const expired = commit && Date.now() >= commit.expiry
  const active = commit && !expired

  const onCommit = () => { setCommit(startCommitment()) }
  const onDecision = d => { logDecision(d); clearCommitment(); setCommit(null); force(x => x + 1) }

  // 空状态
  if (!p) {
    return (
      <div className="mypanic">
        <div className="mp-empty">
          <div className="mp-empty-glow" aria-hidden />
          <div className="mp-empty-eyebrow">// 个人化恐慌系数</div>
          <h3 className="mp-empty-title">市场在慌，<span className="hero-title-accent">你</span>该慌吗？</h3>
          <p className="mp-empty-sub">
            市场恐慌指数只告诉你"大盘"的情绪。录入你的持仓，我们结合
            <b> 市场情绪 × 你的仓位风险 × 你的历史习惯</b>，算出一个真正属于你的
            <b> 个人恐慌分</b>——并在你最想割肉时，提醒你看看过去的自己。
          </p>
          <button className="mp-cta-btn" onClick={onEdit}>录入持仓，算出我的恐慌分 →</button>
          <div className="mp-empty-note">数据只存你本机浏览器 · 不上传 · 随时可删</div>
        </div>
      </div>
    )
  }

  const level = getPanicLevel(p.personal)
  const mLevel = getPanicLevel(p.market)
  const hist = getHistory().slice(-6).reverse()
  const factors = [
    { name: '市场情绪', val: p.market, w: '×0.35' },
    { name: '持仓风险', val: p.positionRisk, w: '×0.40' },
    { name: '习惯修正', val: p.habit, w: '×0.25' },
  ]

  return (
    <div className="mypanic">
      <div className="mp-top">
        {/* 个人分 vs 市场分 */}
        <div className="mp-score-card">
          <span className="hud-corner tl" /><span className="hud-corner br" />
          <div className="mp-score-main">
            <div className="mp-score-label">你的个人恐慌分</div>
            <div className="mp-score-num" style={{ color: level.color }}>{p.personal}</div>
            <div className="mp-score-level" style={{ color: level.color }}>{level.label}</div>
          </div>
          <div className="mp-score-vs">
            <div className="mp-vs-row">
              <span>市场恐慌分</span>
              <strong style={{ color: mLevel.color }}>{p.market}</strong>
            </div>
            <div className="mp-vs-delta">
              {p.personal > p.market
                ? <span className="negative">你比大盘更慌 +{p.personal - p.market}</span>
                : p.personal < p.market
                  ? <span className="positive">你比大盘更稳 {p.personal - p.market}</span>
                  : <span className="neutral">与大盘同步</span>}
            </div>
            <div className="mp-vs-meta">组合 {fmtPrice(p.totalValue)} · {p.holdingsCount} 只持仓</div>
          </div>
        </div>

        {/* 三因子构成 */}
        <div className="mp-factors-card">
          <div className="mp-card-title">恐慌分怎么来的</div>
          {factors.map(f => (
            <div key={f.name} className="mp-factor">
              <span className="mp-factor-name">{f.name}<em>{f.w}</em></span>
              <div className="mp-factor-bar"><div className="mp-factor-fill" style={{ width: `${f.val}%` }} /></div>
              <span className="mp-factor-val">{f.val}</span>
            </div>
          ))}
          <div className="mp-formula">个人 = 市场×0.35 + 持仓风险×0.40 + 习惯×0.25</div>
        </div>
      </div>

      {/* 持仓风险拆解 */}
      <div className="mp-risk-card">
        <div className="mp-card-title">谁在拖累你的情绪 <em>按今日恐慌贡献排序</em></div>
        <div className="mp-risk-list">
          {p.breakdown.map(b => (
            <div key={b.sym} className="mp-risk-row">
              <span className="mp-risk-sym">{b.sym}</span>
              <span className="mp-risk-name">{b.name}</span>
              <span className="mp-risk-weight">{b.weight}%仓</span>
              {b.cushion > 0 && <span className="mp-risk-cushion" title={`浮盈 ${b.cushion}%，形成成本安全垫`}>🛡 {b.cushion}%</span>}
              <span className={`mp-risk-chg ${b.pct >= 0 ? 'positive' : 'negative'}`}>{b.pct >= 0 ? '+' : ''}{b.pct.toFixed(2)}%</span>
              <div className="mp-risk-bar"><div className="mp-risk-fill" style={{ width: `${Math.min(100, b.contrib * 1.4)}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="mp-bottom">
        {/* 应对建议 + 48h 承诺 */}
        <div className={`mp-advice mp-tone-${advice.tone}`}>
          <div className="mp-advice-title">{advice.title}</div>
          <p className="mp-advice-body">{advice.body}</p>

          {expired ? (
            <div className="mp-commit-expired">
              <div className="mp-commit-q">你的 48 小时到了。当时你承诺等待——结果你怎么做了？</div>
              <div className="mp-commit-btns">
                <button className="mp-decide hold" onClick={() => onDecision('持有')}>我持住了</button>
                <button className="mp-decide sell" onClick={() => onDecision('卖出')}>我卖了</button>
              </div>
            </div>
          ) : active ? (
            <div className="mp-commit-active">
              ⏸ 承诺生效中 · 还剩 <strong>{hoursLeft(commit.expiry)}</strong> 小时
              <button className="mp-commit-cancel" onClick={() => { clearCommitment(); setCommit(null) }}>解除</button>
            </div>
          ) : (
            <button className="mp-advice-cta" onClick={advice.tone === 'high' ? onCommit : onEdit}>
              {advice.cta}
            </button>
          )}
        </div>

        {/* 社区对标 */}
        <div className="mp-community">
          <div className="mp-card-title">和你相似的投资者</div>
          <div className="mp-comm-band">
            <div className="mp-comm-item"><span>{COMMUNITY.label}</span><em>{COMMUNITY.n} 人</em></div>
            <div className="mp-comm-stats">
              <div><b>{COMMUNITY.avgPanic}</b><span>平均恐慌分</span></div>
              <div><b>{COMMUNITY.actRate}%</b><span>今日出手率</span></div>
              <div><b style={{ color: level.color }}>{p.personal}</b><span>你</span></div>
            </div>
          </div>
          <div className="mp-comm-note">初版为预设样本，真实社区聚合开发中。</div>
        </div>
      </div>

      {/* 历史恐慌日记 */}
      {hist.length > 0 && (
        <div className="mp-history">
          <div className="mp-card-title">你的恐慌日记 <em>每天自动记录</em></div>
          <div className="mp-hist-list">
            {hist.map(h => (
              <div key={h.date} className="mp-hist-row">
                <span className="mp-hist-date">{h.date.slice(5)}</span>
                <span className="mp-hist-score">个人 <b>{h.personal}</b></span>
                <span className="mp-hist-market">市场 {h.market}</span>
                {h.decision && <span className={`mp-hist-decision ${h.decision === '持有' ? 'positive' : 'negative'}`}>{h.decision}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mp-edit-row">
        <button className="mp-edit-btn" onClick={onEdit}>编辑持仓</button>
      </div>
    </div>
  )
}
