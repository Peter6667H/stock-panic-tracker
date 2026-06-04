// analytics.js — 衍生市场指标（纯函数，无外部依赖）
// 所有计算均基于 OHLCV 历史，输出"盘面不直接显示"的风险/情绪/趋势指标。

// ── 基础统计 ──────────────────────────────────────────────────
export const mean = a => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function stdev(a) {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1));
}

export function simpleReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(closes[i] / closes[i - 1] - 1);
  return r;
}

export function logReturns(closes) {
  const r = [];
  for (let i = 1; i < closes.length; i++) r.push(Math.log(closes[i] / closes[i - 1]));
  return r;
}

// ── 波动率 ────────────────────────────────────────────────────
// 年化历史波动率 (%)，lookback 为回看交易日数（null=全期）
export function annualizedVol(closes, lookback = null) {
  const lr = logReturns(closes);
  const slice = lookback ? lr.slice(-lookback) : lr;
  return stdev(slice) * Math.sqrt(252) * 100;
}

// ── 回撤 ──────────────────────────────────────────────────────
export function maxDrawdown(closes) {
  let peak = closes[0], maxDD = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    const dd = (c - peak) / peak;
    if (dd < maxDD) maxDD = dd;
  }
  return maxDD * 100; // 负值 %
}

export function currentDrawdown(closes, high52) {
  const last = closes.at(-1);
  const peak = high52 && high52 > 0 ? Math.max(high52, last) : Math.max(...closes);
  return (last - peak) / peak * 100; // 负值或0
}

// ── 均线 ──────────────────────────────────────────────────────
export function sma(closes, period) {
  if (closes.length < period) return null;
  return mean(closes.slice(-period));
}

export function ema(values, period) {
  if (!values.length) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) out.push(values[i] * k + out[i - 1] * (1 - k));
  return out;
}

// ── MACD ──────────────────────────────────────────────────────
export function macd(closes) {
  if (closes.length < 35) return null;
  const e12 = ema(closes, 12), e26 = ema(closes, 26);
  const macdLine = closes.map((_, i) => e12[i] - e26[i]);
  const signal = ema(macdLine, 9);
  return {
    macd:   +macdLine.at(-1).toFixed(3),
    signal: +signal.at(-1).toFixed(3),
    hist:   +(macdLine.at(-1) - signal.at(-1)).toFixed(3),
  };
}

// ── ATR (Wilder) ──────────────────────────────────────────────
export function atr(candles, period = 14) {
  if (candles.length < period + 1) return null;
  const tr = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let a = mean(tr.slice(0, period));
  for (let i = period; i < tr.length; i++) a = (a * (period - 1) + tr[i]) / period;
  return a;
}

// ── Beta / 相关性 (需对齐收益率) ──────────────────────────────
export function beta(stockRet, marketRet) {
  const n = Math.min(stockRet.length, marketRet.length);
  if (n < 20) return null;
  const s = stockRet.slice(-n), m = marketRet.slice(-n);
  const ms = mean(s), mm = mean(m);
  let cov = 0, varM = 0;
  for (let i = 0; i < n; i++) { cov += (s[i] - ms) * (m[i] - mm); varM += (m[i] - mm) ** 2; }
  return varM ? +(cov / varM).toFixed(3) : null;
}

export function correlation(a, b) {
  const n = Math.min(a.length, b.length);
  if (n < 20) return null;
  const x = a.slice(-n), y = b.slice(-n);
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  return (sxx && syy) ? +(sxy / Math.sqrt(sxx * syy)).toFixed(3) : null;
}

// ── VaR 95% (历史模拟, 单日) ──────────────────────────────────
export function var95(closes) {
  const r = simpleReturns(closes).slice(-252).sort((a, b) => a - b);
  if (!r.length) return null;
  const idx = Math.floor(r.length * 0.05);
  return +(r[idx] * 100).toFixed(2); // 负值 %
}

// ── 连涨/连跌天数 (正=连涨, 负=连跌) ──────────────────────────
export function consecutiveStreak(closes) {
  let dir = 0, count = 0;
  for (let i = closes.length - 1; i > 0; i--) {
    const d = closes[i] > closes[i - 1] ? 1 : -1;
    if (dir === 0) { dir = d; count = 1; }
    else if (d === dir) count++;
    else break;
  }
  return dir * count;
}

// ── 按时间对齐两条 K 线，返回各自简单收益率 ──────────────────
function alignedReturns(candlesA, candlesB) {
  const mapB = new Map(candlesB.map(c => [c.time, c.close]));
  const pairs = [];
  for (const c of candlesA) if (mapB.has(c.time)) pairs.push([c.close, mapB.get(c.time)]);
  const ra = [], rb = [];
  for (let i = 1; i < pairs.length; i++) {
    ra.push(pairs[i][0] / pairs[i - 1][0] - 1);
    rb.push(pairs[i][1] / pairs[i - 1][1] - 1);
  }
  return [ra, rb];
}

function clamp(v, lo = 0, hi = 100) { return Math.min(hi, Math.max(lo, v)); }

// ════════════════════════════════════════════════════════════
//  聚合：计算全部衍生指标
//  histMap: { symbol: candles[] }   quotes: { symbol: quote }
// ════════════════════════════════════════════════════════════
export function computeAnalytics(histMap, quotes, groups) {
  const market = histMap['^GSPC'];
  const stocks = {};

  // ── 每只股票指标 ──
  for (const sym of Object.keys(histMap)) {
    const candles = histMap[sym];
    if (!candles || candles.length < 30) continue;
    const closes = candles.map(c => c.close);
    const price  = closes.at(-1);
    const q      = quotes[sym] || {};

    let b = null, corr = null;
    if (market && sym !== '^GSPC') {
      const [rs, rm] = alignedReturns(candles, market);
      b = beta(rs, rm);
      corr = correlation(rs, rm);
    }

    const ma20 = sma(closes, 20), ma50 = sma(closes, 50), ma200 = sma(closes, 200);
    const atrV = atr(candles);

    stocks[sym] = {
      hv20:       +annualizedVol(closes, 20).toFixed(1),
      hv60:       +annualizedVol(closes, 60).toFixed(1),
      maxDD:      +maxDrawdown(closes).toFixed(1),
      curDD:      +currentDrawdown(closes, q.high52).toFixed(1),
      beta:       b,
      corr,
      var95:      var95(closes),
      atr:        atrV ? +atrV.toFixed(2) : null,
      atrPct:     atrV ? +(atrV / price * 100).toFixed(2) : null,
      ma20:       ma20 ? +ma20.toFixed(2) : null,
      ma50:       ma50 ? +ma50.toFixed(2) : null,
      ma200:      ma200 ? +ma200.toFixed(2) : null,
      priceVs200: ma200 ? +((price - ma200) / ma200 * 100).toFixed(1) : null,
      priceVs50:  ma50  ? +((price - ma50)  / ma50  * 100).toFixed(1) : null,
      cross:      (ma50 && ma200) ? (ma50 > ma200 ? 'golden' : 'death') : null,
      macd:       macd(closes),
      streak:     consecutiveStreak(closes),
    };
  }

  // ── 市场宽度 (仅个股+ETF, 不含指数) ──
  const breadthSyms = [...(groups.etfs || []), ...(groups.mag7 || []), ...(groups.tech || [])];
  let up = 0, down = 0, flat = 0;
  for (const s of breadthSyms) {
    const pct = quotes[s]?.pct;
    if (pct == null) continue;
    if (pct > 0.05) up++; else if (pct < -0.05) down++; else flat++;
  }
  const total = up + down + flat;

  // ── 52周新高/新低 (含指数) ──
  let newHigh = 0, newLow = 0;
  const allSyms = Object.keys(quotes);
  for (const s of allSyms) {
    const q = quotes[s];
    if (!q?.high52 || !q?.low52) continue;
    if (q.price >= q.high52 * 0.98) newHigh++;
    if (q.price <= q.low52 * 1.02)  newLow++;
  }

  // ── 平均相关性 (正向资产两两) ──
  const corrSyms = [...(groups.mag7 || []), ...(groups.tech || []), 'QQQ'].filter(s => histMap[s]);
  let corrSum = 0, corrCnt = 0;
  for (let i = 0; i < corrSyms.length; i++) {
    for (let j = i + 1; j < corrSyms.length; j++) {
      const [ra, rb] = alignedReturns(histMap[corrSyms[i]], histMap[corrSyms[j]]);
      const c = correlation(ra, rb);
      if (c != null) { corrSum += c; corrCnt++; }
    }
  }
  const avgCorr = corrCnt ? +(corrSum / corrCnt).toFixed(3) : null;

  // ── 大盘指标 (^GSPC) ──
  const spx     = stocks['^GSPC'] || {};
  const vix     = quotes['^VIX']?.price ?? 20;
  const marketHV = spx.hv20 ?? 20;
  const marketDD = spx.curDD ?? 0;
  const spx200   = spx.priceVs200 ?? 0;

  // ── 综合恐慌指数 (多因子, 0=极乐观 100=极恐慌) ──
  const fVix     = clamp((vix - 12) / (40 - 12) * 100);
  const fBreadth = total ? clamp(down / total * 100) : 50;
  const fDD      = clamp(-marketDD / 20 * 100);
  const fHV      = clamp((marketHV - 10) / 30 * 100);
  const fNewLow  = allSyms.length ? clamp(newLow / allSyms.length * 100) : 0;
  const fMom     = clamp(-spx200 / 15 * 100);

  const panicScore = Math.round(
    fVix * 0.30 + fBreadth * 0.20 + fDD * 0.20 + fHV * 0.15 + fNewLow * 0.10 + fMom * 0.05
  );

  // ── 杠杆ETF衰减 (近一年, 约252交易日) ──
  function ret1y(sym) {
    const c = histMap[sym]?.map(x => x.close);
    if (!c || c.length < 30) return null;
    const start = c.length > 252 ? c[c.length - 252] : c[0];
    return c.at(-1) / start - 1;
  }
  const qqqR  = ret1y('QQQ');
  const tqqqR = ret1y('TQQQ');
  const sqqqR = ret1y('SQQQ');
  const leverage = {};
  if (qqqR != null) {
    leverage.qqqRet1y = +(qqqR * 100).toFixed(1);
    if (tqqqR != null) {
      leverage.tqqq = {
        actual: +(tqqqR * 100).toFixed(1),
        theory: +(qqqR * 3 * 100).toFixed(1),
        decay:  +((qqqR * 3 - tqqqR) * 100).toFixed(1),
      };
    }
    if (sqqqR != null) {
      leverage.sqqq = {
        actual: +(sqqqR * 100).toFixed(1),
        theory: +(qqqR * -3 * 100).toFixed(1),
        decay:  +((qqqR * -3 - sqqqR) * 100).toFixed(1),
      };
    }
  }

  return {
    stocks,
    market: {
      breadth: { up, down, flat, total, upPct: total ? Math.round(up / total * 100) : 0 },
      newHigh, newLow,
      avgCorr,
      marketHV, marketDD, vix,
      panicScore,
      panicFactors: {
        vix:     Math.round(fVix),
        breadth: Math.round(fBreadth),
        drawdown:Math.round(fDD),
        hv:      Math.round(fHV),
        newLow:  Math.round(fNewLow),
        momentum:Math.round(fMom),
      },
    },
    leverage,
    ts: Date.now(),
  };
}
