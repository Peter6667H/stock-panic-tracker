import { SYMBOLS, CN_NAMES } from './constants.js'

// 可作为持仓录入的标的（指数不算持仓）
export const HOLDABLE = [...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech]

const K_HOLD = 'spt.holdings.v1'
const K_HIST = 'spt.history.v1'
const K_COMMIT = 'spt.commit.v1'

const read = (k, fallback) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback }
  catch { return fallback }
}
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

// ── 持仓 ──────────────────────────────────────────────────────
// holding: { sym, shares, cost? }
export const getHoldings = () => read(K_HOLD, [])
export const setHoldings = list => write(K_HOLD, list)
export const clearHoldings = () => { try { localStorage.removeItem(K_HOLD) } catch {} }

// ── 历史恐慌日记 ──────────────────────────────────────────────
// snapshot: { date:'YYYY-MM-DD', personal, market, ts, decision? }
export const getHistory = () => read(K_HIST, [])
export function recordSnapshot(personal, market) {
  if (personal == null) return getHistory()
  const today = new Date().toISOString().slice(0, 10)
  const hist = getHistory()
  const existing = hist.find(h => h.date === today)
  if (existing) { existing.personal = personal; existing.market = market; existing.ts = Date.now() }
  else hist.push({ date: today, personal, market, ts: Date.now() })
  const trimmed = hist.slice(-120)
  write(K_HIST, trimmed)
  return trimmed
}
export function logDecision(decision) {
  const today = new Date().toISOString().slice(0, 10)
  const hist = getHistory()
  const row = hist.find(h => h.date === today)
  if (row) { row.decision = decision; write(K_HIST, hist) }
  return hist
}

// ── 48 小时承诺 ───────────────────────────────────────────────
export const getCommitment = () => read(K_COMMIT, null)
export function startCommitment() {
  const c = { start: Date.now(), expiry: Date.now() + 172800000 } // 48h
  write(K_COMMIT, c); return c
}
export function clearCommitment() { try { localStorage.removeItem(K_COMMIT) } catch {} }

// ── 个人恐慌引擎 ──────────────────────────────────────────────
// personal = market×0.35 + positionRisk×0.40 + habit×0.25  （均归一化 [0,100]）
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export function computePersonal({ holdings, quotes, analytics, marketScore }) {
  if (!holdings?.length || !quotes) return null
  const market = marketScore ?? 50

  // 估值与权重
  const rows = holdings.map(h => {
    const q = quotes[h.sym] || {}
    const price = q.price ?? h.cost ?? 0
    const value = price * (h.shares || 0)
    return { ...h, price, value, pct: q.pct ?? 0 }
  })
  const total = rows.reduce((s, r) => s + r.value, 0) || 1

  // 持仓风险：Σ 权重×"有效跌幅" / 各股 VaR95 基准 ×50
  // 有效跌幅=今日跌幅 × 成本安全垫折扣(有浮盈时大幅降低)
  let posSum = 0
  const breakdown = rows.map(r => {
    const weight = r.value / total
    const drop = Math.max(0, -r.pct)
    // 成本安全垫：浮盈比例越高，同样跌幅造成的实际恐慌越小
    let cushion = 0
    if (r.cost != null && r.cost > 0 && r.price > 0 && r.price > r.cost) {
      cushion = Math.min(1, (r.price - r.cost) / r.price)
    }
    const cushionFactor = Math.max(0, 1 - cushion)
    const effectiveDrop = drop * cushionFactor
    const a = analytics?.stocks?.[r.sym]
    const norm = Math.max(Math.abs(a?.var95 ?? 0), Math.abs(a?.atrPct ?? 0), 2)
    const contrib = weight * (effectiveDrop / norm) * 50
    posSum += contrib
    return {
      sym: r.sym, name: CN_NAMES[r.sym] || r.sym,
      weight: Math.round(weight * 100), pct: r.pct, drop,
      cushion: Math.round(cushion * 100),
      value: r.value, contrib: clamp(contrib, 0, 100),
    }
  }).sort((a, b) => b.contrib - a.contrib)
  const positionRisk = clamp(posSum, 0, 100)

  // 习惯修正：历史均值高于当前市场 → 更易恐慌 → >50；新用户 50
  const hist = getHistory().filter(h => h.market != null)
  let habit = 50
  if (hist.length >= 1) {
    const avg = hist.reduce((s, h) => s + h.market, 0) / hist.length
    habit = clamp(50 + (avg - market) * 0.5, 0, 100)
  }

  const personal = Math.round(clamp(market * 0.35 + positionRisk * 0.40 + habit * 0.25, 0, 100))

  return {
    personal, market: Math.round(market), positionRisk: Math.round(positionRisk), habit: Math.round(habit),
    breakdown, totalValue: total,
    topRisk: breakdown[0],
    holdingsCount: rows.length,
  }
}

// ── 组合体检引擎（硬指标：集中度 / 有效杠杆 / 压力测试 / 护城河）──
// 给"老炮"看的是工程，不是情绪。所有数字源自真实头寸与各股 beta。
const STRESS = [10, 20, 30] // 大盘下跌情景（%）

export function computeHealth({ holdings, quotes, analytics, marketScore }) {
  if (!holdings?.length || !quotes) return null

  const rows = holdings.map(h => {
    const q = quotes[h.sym] || {}
    const a = analytics?.stocks?.[h.sym] || {}
    const price = q.price ?? h.cost ?? 0
    const value = price * (h.shares || 0)
    const beta = (a.beta != null && isFinite(a.beta)) ? a.beta : 1
    const hasCost = h.cost != null && h.cost > 0
    return {
      sym: h.sym, name: CN_NAMES[h.sym] || h.sym, shares: h.shares, cost: h.cost,
      price, value, pct: q.pct ?? 0, beta, hasCost,
    }
  })
  const total = rows.reduce((s, r) => s + r.value, 0) || 1

  // ── 集中度：HHI、有效持仓数、头部权重 ──
  const wsorted = rows.map(r => ({ sym: r.sym, name: r.name, w: r.value / total }))
    .sort((a, b) => b.w - a.w)
  const hhi = wsorted.reduce((s, x) => s + x.w * x.w, 0)
  const effN = hhi > 0 ? 1 / hhi : rows.length
  const top1 = wsorted[0]?.w ?? 0
  const top3 = wsorted.slice(0, 3).reduce((s, x) => s + x.w, 0)
  const concLevel = top1 >= 0.6 ? 'high' : top1 >= 0.4 ? 'mid' : 'low'

  // ── 有效杠杆：加权 beta（含杠杆 ETF 自然放大）──
  const portBeta = rows.reduce((s, r) => s + (r.value / total) * r.beta, 0)

  // ── 压力测试：大盘跌 X% → 用 beta 折算个股跌幅 → 组合浮亏、击穿成本数 ──
  const scenarios = STRESS.map(mDrop => {
    let loss = 0
    const breached = []
    rows.forEach(r => {
      const stockDrop = (r.beta * mDrop) / 100 // 可能为负（反向 ETF 对冲）
      const posLoss = r.value * stockDrop
      loss += posLoss
      const newPrice = r.price * (1 - stockDrop)
      if (r.hasCost && stockDrop > 0 && newPrice < r.cost) {
        breached.push({ sym: r.sym, name: r.name, newPrice, cost: r.cost })
      }
    })
    return {
      drop: mDrop,
      loss: Math.round(loss),
      lossPct: +(loss / total * 100).toFixed(1),
      remaining: Math.round(total - loss),
      breached,
    }
  })

  // ── 每仓护城河：距成本还能跌多少 + 大盘需跌多少才击穿 ──
  const positions = rows.map(r => {
    const toCostPct = (r.hasCost && r.price > 0)
      ? Math.max(0, (r.price - r.cost) / r.price * 100)
      : null
    const hedge = r.beta < 0
    const mktDropToBreach = (toCostPct != null && r.beta > 0)
      ? Math.round(toCostPct / r.beta)
      : null
    const gainPct = r.hasCost ? Math.round((r.price - r.cost) / r.cost * 100) : null
    return {
      sym: r.sym, name: r.name,
      weight: Math.round(r.value / total * 100),
      value: Math.round(r.value), beta: +r.beta.toFixed(2),
      pct: r.pct, gainPct, hasCost: r.hasCost, hedge,
      toCostPct: toCostPct != null ? Math.round(toCostPct) : null,
      mktDropToBreach,
    }
  }).sort((a, b) => b.value - a.value)

  // ── 体检结论：以 -20% 情景的击穿情况定级 ──
  const s20 = scenarios.find(s => s.drop === 20)
  const s10 = scenarios.find(s => s.drop === 10)
  let verdict
  if (s10?.breached.length) {
    verdict = { tone: 'weak', label: '脆弱', text: `大盘只要跌 10%，就有 ${s10.breached.length} 只持仓跌破成本。` }
  } else if (s20?.breached.length) {
    verdict = { tone: 'mid', label: '中等', text: `大盘跌 20% 时，${s20.breached.map(b => b.sym).join('、')} 会跌破成本，其余仍有安全垫。` }
  } else {
    verdict = { tone: 'solid', label: '抗揍', text: '即便大盘跌 20%，你的持仓全线仍在成本价之上。' }
  }

  const discipline = computeDiscipline()
  const emotion = computePersonal({ holdings, quotes, analytics, marketScore })

  return {
    total: Math.round(total), count: rows.length,
    concentration: {
      hhi: +hhi.toFixed(3), effN: +effN.toFixed(1),
      top1: Math.round(top1 * 100), top3: Math.round(top3 * 100),
      level: concLevel, leader: wsorted[0],
    },
    portBeta: +portBeta.toFixed(2),
    scenarios, positions, verdict, discipline, emotion,
  }
}

// 纪律分：基于历史决策记录（持有 vs 割肉），新用户无数据
export function computeDiscipline() {
  const hist = getHistory().filter(h => h.decision)
  if (!hist.length) return { hasData: false, total: 0 }
  const total = hist.length
  const held = hist.filter(h => h.decision === '持有').length
  const sold = total - held
  const panicDays = hist.filter(h => (h.market ?? 0) >= 55)
  const panicSells = panicDays.filter(h => h.decision === '卖出').length
  return {
    hasData: true, total, held, sold,
    holdRate: Math.round(held / total * 100),
    panicDecisions: panicDays.length, panicSells,
  }
}

// 镜子式应对建议（不构成投资建议）
export function adviceFor(p) {
  if (!p) return null
  const { personal, market, positionRisk } = p
  if (personal >= 75) {
    return {
      tone: 'high',
      title: '你的恐慌分明显偏高',
      body: positionRisk >= 60
        ? '你的持仓今天跌幅显著高于平时水平，情绪最容易在这种时候上头。历史上，冲动割肉往往发生在这一刻。'
        : '市场情绪偏紧，但你的持仓未必跌得比平时狠。先分清"市场在慌"和"你该慌"。',
      cta: '我承诺：等 48 小时再做决定',
    }
  }
  if (personal >= 50) {
    return {
      tone: 'mid',
      title: '有压力，但还在可控区',
      body: '你的个人恐慌分高于市场基准' + (personal > market ? `（${personal} vs ${market}）` : '') +
        '，主要来自持仓集中度。盯紧支撑位，别在盘中追加情绪化操作。',
      cta: '记录今天的情绪与决定',
    }
  }
  return {
    tone: 'calm',
    title: '相对平静',
    body: '你的持仓今天没有明显恐慌信号。保持纪律，按计划执行就好。',
    cta: '更新我的持仓',
  }
}
