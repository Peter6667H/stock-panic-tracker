// server.js — uses Yahoo Finance v8 API directly (no crumb/auth required)
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { computeAnalytics } from './analytics.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.static(join(__dirname, 'public')));

// ── Symbol config ─────────────────────────────────────────────
const SYMBOLS = {
  indices: ['^IXIC', '^GSPC', '^VIX'],
  etfs:    ['QQQ', 'TQQQ', 'SQQQ'],
  mag7:    ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  tech:    ['MU', 'AMD', 'INTC'],
};
const ALL = [...SYMBOLS.indices, ...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech];

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://finance.yahoo.com/',
};

// ── Caches ────────────────────────────────────────────────────
let qCache = null, qTime = 0;          // quotes  (15s)
const hCache = new Map();              // history (1h)  key → { d, t }
let aCache = null, aTime = 0;          // analytics (5min)

// ── Fetch one symbol quote via v8 chart (1d range) ────────────
async function fetchQuote(symbol) {
  const enc = encodeURIComponent(symbol);
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?range=1d&interval=1d&includePrePost=true`;
  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${symbol}`);
  const j = await resp.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error(`No result for ${symbol}`);

  const m = r.meta;
  const price     = m.regularMarketPrice      ?? 0;
  const prevClose = m.chartPreviousClose ?? m.previousClose ?? price;
  const change    = price - prevClose;
  const pct       = prevClose !== 0 ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    name:     m.shortName || m.longName || symbol,
    price,
    change:   +change.toFixed(4),
    pct:      +pct.toFixed(4),
    prevClose,
    open:     m.regularMarketOpen ?? price,
    dayHigh:  m.regularMarketDayHigh ?? price,
    dayLow:   m.regularMarketDayLow  ?? price,
    volume:   m.regularMarketVolume  ?? 0,
    avgVol:   0,  // not in v8/chart — filled from history
    high52:   m.fiftyTwoWeekHigh ?? 0,
    low52:    m.fiftyTwoWeekLow  ?? 0,
    mktCap:   m.marketCap ?? null,
    currency: m.currency ?? 'USD',
    state:    m.marketState ?? 'REGULAR',
  };
}

// ── Fetch OHLCV history via v8 chart ─────────────────────────
async function fetchHistory(symbol, period) {
  const ivMap    = { '20y':'1wk','5y':'1wk','1y':'1d','6mo':'1d','1mo':'1d','1w':'60m','1d':'5m' };
  const rangeMap = { '20y':'20y','5y':'5y','1y':'1y','6mo':'6mo','1mo':'1mo','1w':'5d','1d':'1d' };

  const enc  = encodeURIComponent(symbol);
  const iv   = ivMap[period]    || '1d';
  const rng  = rangeMap[period] || '1y';
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${enc}?range=${rng}&interval=${iv}&includePrePost=false`;

  const resp = await fetch(url, { headers: HEADERS });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const j = await resp.json();
  const r = j?.chart?.result?.[0];
  if (!r) throw new Error('No result');

  const ts     = r.timestamp || r.timestamps || [];
  const q      = r.indicators?.quote?.[0] || {};
  const opens  = q.open   || [];
  const highs  = q.high   || [];
  const lows   = q.low    || [];
  const closes = q.close  || [];
  const vols   = q.volume || [];

  const candles = ts
    .map((t, i) => ({
      time:   t,
      open:   opens[i]  != null ? +opens[i].toFixed(4)  : null,
      high:   highs[i]  != null ? +highs[i].toFixed(4)  : null,
      low:    lows[i]   != null ? +lows[i].toFixed(4)   : null,
      close:  closes[i] != null ? +closes[i].toFixed(4) : null,
      volume: vols[i]   ?? 0,
    }))
    .filter(c => c.open != null && c.close != null);

  const currency = r.meta?.currency ?? 'USD';
  const avgVol   = r.meta?.regularMarketVolume ?? 0;

  return { symbol, period, candles, currency, avgVol };
}

// ── Cached getters (reused by endpoints + analytics) ──────────
async function getQuotes() {
  if (qCache && Date.now() - qTime < 15_000) return qCache;

  const results = await Promise.allSettled(ALL.map(fetchQuote));
  const quotes  = {};
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') quotes[ALL[i]] = r.value;
    else console.warn(`[WARN] ${ALL[i]}: ${r.reason?.message}`);
  });

  // Patch avgVol from recent history (fire-and-forget)
  Object.values(quotes).forEach(q => {
    if (q.avgVol === 0) {
      getHistoryCached(q.symbol, '1mo').then(h => {
        const vols = h.candles.map(c => c.volume).filter(Boolean);
        if (vols.length) q.avgVol = Math.round(vols.reduce((a, b) => a + b, 0) / vols.length);
      }).catch(() => {});
    }
  });

  qCache = { quotes, symbols: SYMBOLS, ts: Date.now() };
  qTime  = Date.now();
  return qCache;
}

async function getHistoryCached(sym, period) {
  const key    = `${sym}:${period}`;
  const cached  = hCache.get(key);
  if (cached && Date.now() - cached.t < 3_600_000) return cached.d;
  const d = await fetchHistory(sym, period);
  hCache.set(key, { d, t: Date.now() });
  return d;
}

// ── /api/quotes ───────────────────────────────────────────────
app.get('/api/quotes', async (req, res) => {
  try {
    res.json(await getQuotes());
  } catch (e) {
    console.error('Quotes error:', e.message);
    if (qCache) return res.json(qCache);
    res.status(500).json({ error: e.message });
  }
});

// ── /api/history/:symbol ──────────────────────────────────────
app.get('/api/history/:symbol', async (req, res) => {
  try {
    const sym = decodeURIComponent(req.params.symbol);
    const p   = req.query.period || '1y';
    res.json(await getHistoryCached(sym, p));
  } catch (e) {
    console.error(`History [${req.params.symbol}]:`, e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── /api/analytics — derived indicators (5min cache) ──────────
app.get('/api/analytics', async (req, res) => {
  try {
    if (aCache && Date.now() - aTime < 300_000) return res.json(aCache);

    const { quotes } = await getQuotes();
    const histResults = await Promise.allSettled(ALL.map(s => getHistoryCached(s, '1y')));
    const histMap = {};
    histResults.forEach((r, i) => {
      if (r.status === 'fulfilled') histMap[ALL[i]] = r.value.candles;
      else console.warn(`[WARN] history ${ALL[i]}: ${r.reason?.message}`);
    });

    const analytics = computeAnalytics(histMap, quotes, SYMBOLS);
    aCache = analytics;
    aTime  = Date.now();
    res.json(analytics);
  } catch (e) {
    console.error('Analytics error:', e.message);
    if (aCache) return res.json(aCache);
    res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('\n  ┌────────────────────────────────────────┐');
  console.log('  │   美股恐慌仪表盘已启动                   │');
  console.log(`  │   http://localhost:${PORT}               │`);
  console.log('  └────────────────────────────────────────┘\n');
});
