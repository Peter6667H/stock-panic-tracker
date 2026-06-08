import { useEffect, useMemo, useState } from 'react'
import { getPanicLevel, fmtPrice } from '../lib/utils.js'
import {
  getHoldings, computeHealth, adviceFor, recordSnapshot,
  getHistory, getCommitment, startCommitment, clearCommitment, logDecision,
} from '../lib/portfolio.js'

function hoursLeft(expiry) {
  const ms = expiry - Date.now()
  if (ms <= 0) return 0
  return Math.max(1, Math.round(ms / 3600000))
}

export default function MyPanicSection({ quotes, analytics, marketScore, holdingsVersion, onEdit }) {
  const holdings = getHoldings()
  const h = useMemo(
    () => computeHealth({ holdings, quotes, analytics, marketScore }),
    [holdingsVersion, quotes, analytics, marketScore], // eslint-disable-line
  )
  const emo = h?.emotion
  const advice = adviceFor(emo)

  const [scenIdx, setScenIdx] = useState(1) // 默认看 -20% 情景
  const [commit, setCommit] = useState(getCommitment())
  const [, force] = useState(0)

  // 记录每日快照（用于纪律分与历史日记）
  useEffect(() => {
    if (emo?.personal != null) recordSnapshot(emo.personal, emo.market)
  }, [emo?.personal, emo?.market])

  const expired = commit && Date.now() >= commit.expiry
  const active = commit && !expired
  const onCommit = () => { setCommit(startCommitment()) }
  const onDecision = d => { logDecision(d); clearCommitment(); setCommit(null); force(x => x + 1) }

  // ── 空状态 ──
  if (!h) {
    return (
      <div className="mypanic">
        <div className="mp-empty">
          <div className="mp-empty-glow" aria-hidden />
          <div className="mp-empty-eyebrow">// 组合体检 · PORTFOLIO STRESS TEST</div>
          <h3 className="mp-empty-title">大盘跌 20%，<span className="hero-title-accent">你扛得住吗？</span></h3>
          <p className="mp-empty-sub">
            恐慌指数只说"大盘"的情绪。录入持仓，我们用各股 <b>β 系数</b>做
            <b> 压力测试</b>：大盘下挫时你浮亏多少、哪只先跌破成本、组合
            <b> 有效杠杆</b>和<b> 集中度</b>有多高——全是硬数字，不灌鸡汤。
          </p>
          <button className="mp-cta-btn" onClick={onEdit}>录入持仓，做一次组合体检 →</button>
          <div className="mp-empty-note">数据只存你本机浏览器 · 不上传 · 随时可删</div>
        </div>
      </div>
    )
  }

  const { concentration: c, scenarios, positions, verdict, portBeta, discipline } = h
  const scen = scenarios[scenIdx]
  const hist = getHistory().slice(-6).reverse()
  const levBadge = portBeta >= 1.5 ? 'high' : portBeta >= 1.05 ? 'mid' : 'low'

  return (
    <div className="mypanic">
      {/* ── 顶部：体检结论 ── */}
      <div className={`mp-verdict mp-v-${verdict.tone}`}>
        <span className="hud-corner tl" /><span className="hud-corner br" />
        <div className="mp-verdict-grade">{verdict.label}</div>
        <div className="mp-verdict-body">
          <div className="mp-verdict-text">{verdict.text}</div>
          <div className="mp-verdict-meta">组合市值 {fmtPrice(h.total)} · {h.count} 只持仓 · 有效杠杆 β {portBeta.toFixed(2)}</div>
        </div>
      </div>

      {/* ── 压力测试矩阵（核心）── */}
      <div className="mp-stress-card">
        <div className="mp-card-title">压力测试 <em>大盘下跌时，你的组合会怎样（按各股 β 折算）</em></div>
        <div className="mp-scen-tabs">
          {scenarios.map((s, i) => (
            <button key={s.drop}
              className={`mp-scen-tab${i === scenIdx ? ' active' : ''}`}
              onClick={() => setScenIdx(i)}>
              大盘 −{s.drop}%
            </button>
          ))}
        </div>
        <div className="mp-scen-body">
          <div className="mp-scen-stats">
            <div className="mp-scen-stat">
              <span className={`mp-scen-num ${scen.loss >= 0 ? 'negative' : 'positive'}`}>
                {scen.loss >= 0 ? '−' : '+'}{fmtPrice(Math.abs(scen.loss))}
              </span>
              <span className="mp-scen-lbl">预计{scen.loss >= 0 ? '浮亏' : '浮盈'}（{Math.abs(scen.lossPct)}%）</span>
            </div>
            <div className="mp-scen-stat">
              <span className="mp-scen-num">{fmtPrice(scen.remaining)}</span>
              <span className="mp-scen-lbl">剩余市值</span>
            </div>
            <div className="mp-scen-stat">
              <span className={`mp-scen-num ${scen.breached.length ? 'negative' : 'positive'}`}>{scen.breached.length}</span>
              <span className="mp-scen-lbl">跌破成本的持仓</span>
            </div>
          </div>
          {scen.breached.length > 0 ? (
            <div className="mp-scen-breach">
              ⚠ <b>{scen.breached.map(b => b.sym).join('、')}</b> 将跌破成本价
              {scen.breached.map(b => (
                <span key={b.sym} className="mp-breach-pill">{b.sym} {fmtPrice(b.newPrice)} ＜ 成本 {fmtPrice(b.cost)}</span>
              ))}
            </div>
          ) : (
            <div className="mp-scen-safe">🛡 该情景下所有持仓仍在成本价之上 —— 这只是账面回吐，不是真亏。</div>
          )}
        </div>
      </div>

      {/* ── 集中度 + 杠杆 ── */}
      <div className="mp-metrics-row">
        <div className="mp-metric-card">
          <div className="mp-card-title">集中度</div>
          <div className="mp-metric-main">
            <span className={`mp-metric-num conc-${c.level}`}>{c.top1}%</span>
            <span className="mp-metric-unit">最大单仓 · {c.leader?.name}</span>
          </div>
          <div className="mp-metric-bars">
            {positions.slice(0, 5).map(p => (
              <div key={p.sym} className="mp-conc-bar" title={`${p.sym} ${p.weight}%`}>
                <div className="mp-conc-fill" style={{ width: `${p.weight}%` }} />
                <span className="mp-conc-tag">{p.sym} {p.weight}%</span>
              </div>
            ))}
          </div>
          <div className="mp-metric-note">
            有效持仓数 <b>{c.effN}</b> 只
            {c.level === 'high' ? ' · 单票主导，风险高度集中' : c.level === 'mid' ? ' · 偏集中' : ' · 相对分散'}
          </div>
        </div>

        <div className="mp-metric-card">
          <div className="mp-card-title">有效杠杆</div>
          <div className="mp-metric-main">
            <span className={`mp-metric-num lev-${levBadge}`}>β {portBeta.toFixed(2)}</span>
            <span className="mp-metric-unit">组合对标普500的敏感度</span>
          </div>
          <div className="mp-lev-scale">
            <div className="mp-lev-track">
              <div className="mp-lev-marker" style={{ left: `${Math.min(100, portBeta / 3 * 100)}%` }} />
            </div>
            <div className="mp-lev-ticks"><span>0</span><span>1.0 大盘</span><span>3.0</span></div>
          </div>
          <div className="mp-metric-note">
            {portBeta >= 1.5 ? '大盘每动 1%，你的组合约动 ' + portBeta.toFixed(1) + '% —— 杠杆偏高，双刃剑。'
              : portBeta >= 1.05 ? '略高于大盘波动，进攻性温和。'
                : '低于大盘波动，偏防守。'}
          </div>
        </div>
      </div>

      {/* ── 持仓护城河表 ── */}
      <div className="mp-moat-card">
        <div className="mp-card-title">持仓护城河 <em>每只股票距成本价的安全空间</em></div>
        <div className="mp-moat-head">
          <span>标的</span><span>仓位</span><span>β</span><span>今日</span><span>距成本</span><span>大盘跌多少击穿</span>
        </div>
        <div className="mp-moat-list">
          {positions.map(p => (
            <div key={p.sym} className="mp-moat-row">
              <span className="mp-moat-sym">{p.sym}<em>{p.name}</em></span>
              <span className="mp-moat-w">{p.weight}%</span>
              <span className="mp-moat-beta">{p.beta}</span>
              <span className={`mp-moat-chg ${p.pct >= 0 ? 'positive' : 'negative'}`}>{p.pct >= 0 ? '+' : ''}{p.pct.toFixed(2)}%</span>
              <span className="mp-moat-cost">
                {p.hedge ? <span className="mp-tag-hedge">反向对冲</span>
                  : p.toCostPct == null ? <span className="mp-moat-nocost">未填成本</span>
                    : <span className={p.toCostPct > 30 ? 'positive' : p.toCostPct > 10 ? 'neutral' : 'negative'}>还能跌 {p.toCostPct}%</span>}
              </span>
              <span className="mp-moat-breach">
                {p.hedge ? '—'
                  : p.mktDropToBreach == null ? '—'
                    : <span className={p.mktDropToBreach >= 20 ? 'positive' : p.mktDropToBreach >= 8 ? 'neutral' : 'negative'}>−{p.mktDropToBreach}%</span>}
              </span>
            </div>
          ))}
        </div>
        <div className="mp-moat-foot">"大盘跌多少击穿" = 距成本空间 ÷ β。数值越大越扛揍。填了成本价才有此列。</div>
      </div>

      {/* ── 辅助：情绪因子（降级）+ 纪律分 ── */}
      <div className="mp-aux-row">
        <div className="mp-aux-card">
          <div className="mp-card-title">情绪因子 <em>仅供参考，非投资建议</em></div>
          <div className="mp-emo">
            <div className="mp-emo-score">
              <span className="mp-emo-num" style={{ color: getPanicLevel(emo.personal).color }}>{emo.personal}</span>
              <span className="mp-emo-lbl">情绪温度 / 100</span>
            </div>
            <div className="mp-emo-vs">
              <span>大盘 {emo.market}</span>
              <span className={emo.personal > emo.market ? 'negative' : 'positive'}>
                {emo.personal > emo.market ? `你更紧张 +${emo.personal - emo.market}` : emo.personal < emo.market ? `你更稳 ${emo.personal - emo.market}` : '与大盘同步'}
              </span>
            </div>
          </div>
          {advice && (
            <div className={`mp-emo-advice mp-tone-${advice.tone}`}>
              <p>{advice.body}</p>
              {expired ? (
                <div className="mp-commit-expired">
                  <div className="mp-commit-q">48 小时到了。当时你承诺等待——结果你怎么做了？</div>
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
              ) : advice.tone === 'high' ? (
                <button className="mp-advice-cta" onClick={onCommit}>{advice.cta}</button>
              ) : null}
            </div>
          )}
        </div>

        <div className="mp-aux-card">
          <div className="mp-card-title">纪律分 <em>你说到做到了吗</em></div>
          {discipline.hasData ? (
            <div className="mp-disc">
              <div className="mp-disc-main">
                <span className="mp-disc-num">{discipline.holdRate}%</span>
                <span className="mp-disc-lbl">决策中选择持有的比例</span>
              </div>
              <div className="mp-disc-stats">
                <div><b>{discipline.total}</b><span>累计决策</span></div>
                <div><b className="positive">{discipline.held}</b><span>持有</span></div>
                <div><b className="negative">{discipline.sold}</b><span>卖出</span></div>
              </div>
              {discipline.panicDecisions > 0 && (
                <div className="mp-disc-note">
                  其中 {discipline.panicDecisions} 次发生在市场恐慌日，
                  {discipline.panicSells > 0
                    ? <b className="negative">{discipline.panicSells} 次恐慌中割肉</b>
                    : <b className="positive">没有一次恐慌割肉</b>}。
                </div>
              )}
            </div>
          ) : (
            <div className="mp-disc-empty">
              <p>还没有决策记录。每当市场剧烈波动、你做出"持有/卖出"的选择，这里会自动累积，
                30 天后给你一份<b> 操盘纪律报告</b>——多数人从没系统追踪过自己的决策质量。</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 历史日记 ── */}
      {hist.length > 0 && (
        <div className="mp-history">
          <div className="mp-card-title">恐慌日记 <em>每天自动记录</em></div>
          <div className="mp-hist-list">
            {hist.map(d => (
              <div key={d.date} className="mp-hist-row">
                <span className="mp-hist-date">{d.date.slice(5)}</span>
                <span className="mp-hist-score">情绪 <b>{d.personal}</b></span>
                <span className="mp-hist-market">市场 {d.market}</span>
                {d.decision && <span className={`mp-hist-decision ${d.decision === '持有' ? 'positive' : 'negative'}`}>{d.decision}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mp-edit-row">
        <button className="mp-edit-btn" onClick={onEdit}>编辑持仓</button>
        <span className="mp-edit-hint">填上成本价，护城河与击穿测算才完整。</span>
      </div>
    </div>
  )
}
