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
