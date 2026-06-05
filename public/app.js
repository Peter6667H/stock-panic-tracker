// ════════════════════════════════════════════════════
//  美股恐慌仪表盘 — Frontend Logic
// ════════════════════════════════════════════════════

// ── Config ────────────────────────────────────────────────────
const SYMBOLS = {
  indices: ['^IXIC', '^GSPC', '^VIX'],
  etfs:    ['QQQ', 'TQQQ', 'SQQQ'],
  mag7:    ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  tech:    ['MU', 'AMD', 'INTC'],
};

const CN_NAMES = {
  '^IXIC':'纳斯达克综合', '^GSPC':'标普500', '^VIX':'VIX恐慌指数',
  'QQQ':'QQQ 纳指ETF',   'TQQQ':'TQQQ 3倍做多', 'SQQQ':'SQQQ 3倍做空',
  'AAPL':'苹果',  'MSFT':'微软', 'GOOGL':'谷歌', 'AMZN':'亚马逊',
  'META':'Meta',  'NVDA':'英伟达', 'TSLA':'特斯拉',
  'MU':'美光科技', 'AMD':'AMD', 'INTC':'英特尔',
};

const PANIC_LEVELS = [
  { min:80, label:'极度恐慌', desc:'市场崩盘模式，极端超卖', color:'#ef4444' },
  { min:60, label:'恐慌',     desc:'大量抛售，情绪极度悲观', color:'#f97316' },
  { min:40, label:'担忧',     desc:'市场情绪负面，需谨慎',   color:'#eab308' },
  { min:20, label:'中性',     desc:'市场平稳运行',           color:'#84cc16' },
  { min:0,  label:'乐观',     desc:'市场积极，情绪高涨',     color:'#22c55e' },
];

// ── Search keyword aliases (代码/中文名之外的可搜词) ──────────
const SEARCH_ALIASES = {
  '^IXIC': ['nasdaq', '纳指', '纳斯达克', '综合指数'],
  '^GSPC': ['s&p', 'sp500', 'spx', '标普', '标准普尔', '大盘'],
  '^VIX':  ['vix', '恐慌', '波动率', 'fear', 'volatility'],
  'QQQ':   ['qqq', '纳指etf', '纳斯达克100', 'nasdaq100'],
  'TQQQ':  ['tqqq', '三倍做多', '3倍做多', '杠杆', 'leverage', 'bull'],
  'SQQQ':  ['sqqq', '三倍做空', '3倍做空', '做空', '反向', 'bear', 'inverse'],
  'AAPL':  ['apple', '苹果', 'iphone'],
  'MSFT':  ['microsoft', '微软', 'windows', 'azure'],
  'GOOGL': ['google', 'alphabet', '谷歌', '安卓', 'android'],
  'AMZN':  ['amazon', '亚马逊', 'aws'],
  'META':  ['meta', 'facebook', '脸书', 'instagram', '元宇宙'],
  'NVDA':  ['nvidia', '英伟达', '显卡', 'gpu', 'ai', '人工智能'],
  'TSLA':  ['tesla', '特斯拉', '电动车', '马斯克', 'musk'],
  'MU':    ['micron', '美光', '内存', '存储', 'memory'],
  'AMD':   ['amd', '超威', 'cpu', '锐龙', 'ryzen'],
  'INTC':  ['intel', '英特尔', '酷睿', 'core'],
};

// ── Searchable metrics / sections (跳转到对应板块) ───────────
const SEARCH_TERMS = [
  { name:'综合恐慌指数',   sub:'多因子综合评分 0-100',        target:'sec-panic',     kw:['恐慌','fear','panic','指数','情绪'] },
  { name:'VIX 恐慌指数',   sub:'市场预期波动率',              target:'sec-panic',     kw:['vix','波动率'] },
  { name:'市场宽度',       sub:'上涨家数占比 · 普跌=系统性恐慌', target:'sec-structure', kw:['宽度','breadth','上涨家数','涨跌家数'] },
  { name:'52周新高/新低',  sub:'创新低家数飙升=恐慌扩散',      target:'sec-structure', kw:['新高','新低','52周','high','low'] },
  { name:'平均相关性',     sub:'抱团度 · 趋近1=齐涨齐跌',      target:'sec-structure', kw:['相关性','correlation','抱团','联动'] },
  { name:'历史波动率 HV',  sub:'实际波动 vs 预期 VIX',         target:'sec-structure', kw:['hv','历史波动率','波动','volatility'] },
  { name:'杠杆 ETF',       sub:'QQQ · TQQQ · SQQQ',           target:'sec-etf',       kw:['杠杆','etf','tqqq','sqqq','qqq'] },
  { name:'科技七姐妹 Mag7', sub:'七大科技龙头股',              target:'sec-mag7',      kw:['mag7','七姐妹','magnificent','科技股','七巨头'] },
  { name:'半导体 / 科技股', sub:'美光 · AMD · 英特尔',          target:'sec-tech',      kw:['半导体','芯片','semiconductor','chip'] },
  { name:'风险指标矩阵',   sub:'HV/Beta/回撤/VaR 一览表',      target:'sec-risk',      kw:['风险','矩阵','指标','risk','matrix'] },
  { name:'Beta 贝塔系数',  sub:'对标普500的波动敏感度',        target:'sec-risk',      kw:['beta','贝塔','敏感度'] },
  { name:'最大回撤',       sub:'距高点最大跌幅',              target:'sec-risk',      kw:['回撤','drawdown','dd','跌幅'] },
  { name:'VaR 在险价值',   sub:'95%置信单日最大可能亏损',      target:'sec-risk',      kw:['var','在险价值','风险价值'] },
  { name:'ATR 真实波幅',   sub:'含跳空的日内波动',            target:'sec-risk',      kw:['atr','真实波幅','波幅'] },
  { name:'均线 / MA200',   sub:'200日生死线 · 金叉死叉',       target:'sec-risk',      kw:['均线','ma','ma200','生死线','金叉','死叉'] },
  { name:'杠杆ETF衰减',    sub:'波动损耗 vs 复利增益',         target:'sec-leverage',  kw:['衰减','decay','损耗','复利'] },
  { name:'K线图表',        sub:'最长20年走势 + 均线 + RSI',    target:'sec-chart',     kw:['k线','图表','chart','走势','rsi','蜡烛'] },
];

// ── State ─────────────────────────────────────────────────────
let selectedSym    = 'AAPL';
let selectedPeriod = '1y';
let mainChart      = null;
let candleSeries   = null;
let volumeSeries   = null;
let rsiChart       = null;
let rsiSeries      = null;
let quoteData      = null;
let analyticsData  = null;
let maSeries       = {};
let riskSort       = { key: 'beta', dir: 'desc' };

// ── Utilities ─────────────────────────────────────────────────
function getPanicLevel(score) {
  return PANIC_LEVELS.find(l => score >= l.min) || PANIC_LEVELS.at(-1);
}

function fmtPrice(p, prefix = '$') {
  if (p == null || isNaN(p)) return '--';
  if (p > 10_000) return prefix + p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p > 1_000)  return prefix + p.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (p > 100)    return prefix + p.toFixed(2);
  return prefix + p.toFixed(4);
}

function fmtChg(change, pct) {
  if (change == null) return { text: '--', cls: '' };
  const sign = change >= 0 ? '+' : '';
  const arrow = change >= 0 ? '▲' : '▼';
  return {
    text: `${arrow} ${sign}${pct.toFixed(2)}%  (${sign}${change.toFixed(2)})`,
    cls:  change >= 0 ? 'positive' : 'negative',
  };
}

function fmtVol(v) {
  if (!v) return '--';
  if (v > 1e9) return (v / 1e9).toFixed(2) + 'B';
  if (v > 1e6) return (v / 1e6).toFixed(2) + 'M';
  if (v > 1e3) return (v / 1e3).toFixed(1) + 'K';
  return String(v);
}

function fmtMktCap(mc) {
  if (!mc) return '--';
  if (mc > 1e12) return '$' + (mc / 1e12).toFixed(2) + 'T';
  if (mc > 1e9)  return '$' + (mc / 1e9).toFixed(1) + 'B';
  return '$' + (mc / 1e6).toFixed(0) + 'M';
}

function rangePos(price, low52, high52) {
  if (!high52 || !low52 || high52 === low52) return 50;
  return Math.round(Math.min(100, Math.max(0, (price - low52) / (high52 - low52) * 100)));
}

// ── RSI calculation (Wilder's smoothing) ──────────────────────
function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d >= 0) gains += d; else losses -= d;
  }
  let ag = gains / period, al = losses / period;
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    ag = (ag * (period - 1) + Math.max(0,  d)) / period;
    al = (al * (period - 1) + Math.max(0, -d)) / period;
  }
  if (al === 0) return 100;
  return +(100 - 100 / (1 + ag / al)).toFixed(2);
}

// Build series of RSI values from candles
function buildRSISeries(candles, period = 14) {
  const series = [];
  const closes = candles.map(c => c.close);
  for (let i = period; i < closes.length; i++) {
    const rsi = calcRSI(closes.slice(0, i + 1), period);
    if (rsi != null) series.push({ time: candles[i].time, value: rsi });
  }
  return series;
}

// ── Panic score ───────────────────────────────────────────────
function calculatePanic(quotes) {
  const vix     = quotes['^VIX']?.price ?? 20;
  const nasdaq  = quotes['^IXIC']?.pct  ?? 0;

  // VIX component: 10=very calm → 50+=extreme panic, mapped to 0→100
  const vixScore = Math.min(100, Math.max(0, (vix - 10) / 40 * 100));

  // Mag7 average change: −5% → 100, 0% → 50, +5% → 0
  const mag7Syms   = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'];
  const mag7Chgs   = mag7Syms.map(s => quotes[s]?.pct ?? 0);
  const avgChg     = mag7Chgs.reduce((a, b) => a + b, 0) / mag7Chgs.length;
  const chgScore   = Math.min(100, Math.max(0, (-avgChg + 5) / 10 * 100));

  // SQQQ surge bonus (inverse ETF rising = market fear)
  const sqqqPct  = quotes['SQQQ']?.pct ?? 0;
  const sqqqBonus = Math.min(15, Math.max(0, sqqqPct * 1.5));

  const score = vixScore * 0.5 + chgScore * 0.4 + sqqqBonus * 0.1;
  return Math.round(Math.min(100, Math.max(0, score)));
}

// ── Gauge (Canvas) ───────────────────────────────────────────
function drawGauge(canvas, score) {
  const ctx  = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  ctx.clearRect(0, 0, W, H);

  const cx      = W / 2;
  const cy      = H * 0.82;
  const outerR  = Math.min(W * 0.44, H * 0.82);
  const innerR  = outerR * 0.7;
  const midR    = (outerR + innerR) / 2;
  const trackW  = outerR - innerR;

  // Background track
  ctx.beginPath();
  ctx.arc(cx, cy, midR, Math.PI, 0, false);
  ctx.strokeStyle = '#ece9e0';
  ctx.lineWidth = trackW + 2;
  ctx.lineCap = 'butt';
  ctx.stroke();

  // Colored segments
  const segs = [
    [0, 0.2, '#22c55e'],
    [0.2, 0.4, '#84cc16'],
    [0.4, 0.6, '#eab308'],
    [0.6, 0.8, '#f97316'],
    [0.8, 1.0, '#ef4444'],
  ];
  const ratio = score / 100;
  for (const [s, e, col] of segs) {
    if (ratio <= s) break;
    ctx.beginPath();
    ctx.arc(cx, cy, midR, Math.PI + s * Math.PI, Math.PI + Math.min(ratio, e) * Math.PI, false);
    ctx.strokeStyle = col;
    ctx.lineWidth = trackW;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  // Glow at needle tip
  const level    = getPanicLevel(score);
  const glowAng  = Math.PI + ratio * Math.PI;
  const glowX    = cx + midR * Math.cos(glowAng);
  const glowY    = cy + midR * Math.sin(glowAng);
  const grd      = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, trackW * 2);
  grd.addColorStop(0, level.color + 'aa');
  grd.addColorStop(1, level.color + '00');
  ctx.beginPath();
  ctx.arc(glowX, glowY, trackW * 2, 0, 2 * Math.PI);
  ctx.fillStyle = grd;
  ctx.fill();

  // Needle
  const needleLen = innerR * 0.88;
  const baseW     = 5;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(glowAng);
  ctx.beginPath();
  ctx.moveTo(-needleLen, 0);
  ctx.lineTo(14, -baseW / 2);
  ctx.lineTo(14,  baseW / 2);
  ctx.closePath();
  ctx.fillStyle = '#21201c';
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.restore();

  // Center cap
  ctx.beginPath();
  ctx.arc(cx, cy, trackW * 0.38, 0, 2 * Math.PI);
  ctx.fillStyle = '#21201c';
  ctx.shadowBlur = 0;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, trackW * 0.22, 0, 2 * Math.PI);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  // Tick marks + labels
  ctx.font = `bold ${Math.round(trackW * 0.55)}px system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ['0', '25', '50', '75', '100'].forEach((lbl, i) => {
    const ang = Math.PI + (i / 4) * Math.PI;
    const r1  = outerR + 6, r2 = outerR + 14, rL = outerR + 22;
    ctx.beginPath();
    ctx.moveTo(cx + r1 * Math.cos(ang), cy + r1 * Math.sin(ang));
    ctx.lineTo(cx + r2 * Math.cos(ang), cy + r2 * Math.sin(ang));
    ctx.strokeStyle = '#d6d0c2';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = '#8a8478';
    ctx.fillText(lbl, cx + rL * Math.cos(ang), cy + rL * Math.sin(ang));
  });

  // Zone labels on track (horizontal, always upright)
  const zoneLbls = [
    [0.1, '乐观'], [0.3, '中性'], [0.5, '担忧'], [0.7, '恐慌'], [0.9, '极恐'],
  ];
  ctx.font = `600 ${Math.round(trackW * 0.42)}px system-ui`;
  ctx.fillStyle = '#57534a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [r, txt] of zoneLbls) {
    const ang = Math.PI + r * Math.PI;
    const x   = cx + midR * Math.cos(ang);
    const y   = cy + midR * Math.sin(ang);
    ctx.fillText(txt, x, y);
  }
}

// ── Chart (TradingView Lightweight Charts) ────────────────────
function initCharts() {
  // Main candlestick + volume chart
  const mainEl = document.getElementById('chartContainer');
  mainChart = LightweightCharts.createChart(mainEl, {
    layout:  { background: { color: '#fbfaf6' }, textColor: '#8a8478' },
    grid:    { vertLines: { color: '#efece4' }, horzLines: { color: '#efece4' } },
    crosshair: {
      mode: LightweightCharts.CrosshairMode.Normal,
      vertLine: { color: '#cc785c88', labelBackgroundColor: '#cc785c' },
      horzLine: { color: '#cc785c88', labelBackgroundColor: '#cc785c' },
    },
    rightPriceScale: { borderColor: '#e9e5db' },
    timeScale: { borderColor: '#e9e5db', timeVisible: true, secondsVisible: false },
    handleScroll: true,
    handleScale:  true,
  });

  candleSeries = mainChart.addCandlestickSeries({
    upColor: '#4f9d69', downColor: '#c8503d',
    borderUpColor: '#4f9d69', borderDownColor: '#c8503d',
    wickUpColor: '#4f9d69', wickDownColor: '#c8503d',
  });

  // Moving-average overlays (share the candles' right price scale)
  maSeries.ma20  = mainChart.addLineSeries({ color: '#5a7fb8', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  maSeries.ma50  = mainChart.addLineSeries({ color: '#c4863a', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });
  maSeries.ma200 = mainChart.addLineSeries({ color: '#c8503d', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false });

  volumeSeries = mainChart.addHistogramSeries({
    color: '#cc785c2e',
    priceFormat: { type: 'volume' },
    priceScaleId: 'vol',
  });
  mainChart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

  // RSI chart below
  const rsiEl = document.getElementById('rsiContainer');
  rsiChart = LightweightCharts.createChart(rsiEl, {
    layout:  { background: { color: '#fbfaf6' }, textColor: '#8a8478' },
    grid:    { vertLines: { color: '#efece4' }, horzLines: { color: '#efece4' } },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
    rightPriceScale: { borderColor: '#e9e5db', visible: true },
    timeScale: { borderColor: '#e9e5db', visible: false },
    handleScroll: false,
    handleScale:  false,
  });

  rsiSeries = rsiChart.addLineSeries({
    color: '#8a72b5',
    lineWidth: 1.5,
    priceLineVisible: false,
  });

  // Overbought/oversold reference lines
  rsiChart.addLineSeries({ color: '#c8503d33', lineWidth: 1, lineStyle: 2, priceLineVisible: false })
          .setData([]);
  rsiChart.addLineSeries({ color: '#4f9d6933', lineWidth: 1, lineStyle: 2, priceLineVisible: false })
          .setData([]);

  // Sync timescale scrolling
  mainChart.timeScale().subscribeVisibleTimeRangeChange(range => {
    if (range) rsiChart.timeScale().setVisibleRange(range);
  });

  // Resize observer
  const ro = new ResizeObserver(() => {
    mainChart.resize(mainEl.clientWidth, mainEl.clientHeight);
    rsiChart.resize(rsiEl.clientWidth,   rsiEl.clientHeight);
  });
  ro.observe(mainEl);
  ro.observe(rsiEl);
}

async function loadChart(symbol, period) {
  document.getElementById('chartLoading').classList.remove('hidden');
  document.getElementById('chartSymbol').textContent = symbol.replace('^', '');
  document.getElementById('chartRsi').textContent = '';

  const q = quoteData?.quotes?.[symbol];
  document.getElementById('chartName').textContent =
    q?.name || CN_NAMES[symbol] || symbol;

  try {
    const r   = await fetch(`/api/history/${encodeURIComponent(symbol)}?period=${period}`);
    const data = await r.json();
    if (!data.candles?.length) throw new Error('无数据');

    const candles = data.candles;
    candleSeries.setData(candles);
    volumeSeries.setData(candles.map(c => ({
      time:  c.time,
      value: c.volume,
      color: c.close >= c.open ? '#4f9d6944' : '#c8503d44',
    })));

    // RSI
    const rsiData = buildRSISeries(candles);
    rsiSeries.setData(rsiData);

    const lastRsi = rsiData.at(-1)?.value;
    if (lastRsi != null) {
      const el = document.getElementById('chartRsi');
      el.textContent = `RSI ${lastRsi.toFixed(1)}`;
      el.className = 'chart-rsi ' + (lastRsi < 30 ? 'negative' : lastRsi > 70 ? 'positive' : 'neutral');
    }

    // Moving averages — show on monthly+ periods only
    const showMA = ['1mo', '6mo', '1y', '5y', '20y'].includes(period);
    maSeries.ma20.setData(showMA && candles.length > 20  ? maLine(candles, 20)  : []);
    maSeries.ma50.setData(showMA && candles.length > 50  ? maLine(candles, 50)  : []);
    maSeries.ma200.setData(showMA && candles.length > 200 ? maLine(candles, 200) : []);

    mainChart.timeScale().fitContent();
    rsiChart.timeScale().fitContent();

    // Update stats
    renderChartStats(symbol, data.currency);
  } catch (e) {
    console.error('Chart load error:', e);
  } finally {
    document.getElementById('chartLoading').classList.add('hidden');
  }
}

function renderChartStats(symbol, currency = 'USD') {
  const q = quoteData?.quotes?.[symbol];
  if (!q) return;

  const cur  = currency === 'USD' ? '$' : '';
  const rPos = rangePos(q.price, q.low52, q.high52);
  const volR = q.avgVol > 0 ? (q.volume / q.avgVol).toFixed(2) : '--';
  const a    = analyticsData?.stocks?.[symbol];
  const sgn  = v => (v >= 0 ? '+' : '') + v;

  // Derived (calculated) indicators block
  const aStats = a ? `
    <div class="stat-item"><span class="s-label">HV20</span><span class="s-val">${a.hv20}%</span></div>
    <div class="stat-item"><span class="s-label">Beta</span><span class="s-val ${a.beta > 1.2 ? 'negative' : a.beta < 0 ? 'positive' : ''}">${a.beta ?? '--'}</span></div>
    <div class="stat-item"><span class="s-label">当前回撤</span><span class="s-val negative">${a.curDD}%</span></div>
    <div class="stat-item"><span class="s-label">最大回撤</span><span class="s-val negative">${a.maxDD}%</span></div>
    <div class="stat-item"><span class="s-label">VaR95</span><span class="s-val negative">${a.var95}%</span></div>
    <div class="stat-item"><span class="s-label">距MA200</span><span class="s-val ${a.priceVs200 >= 0 ? 'positive' : 'negative'}">${sgn(a.priceVs200)}%</span></div>
    <div class="stat-item"><span class="s-label">ATR</span><span class="s-val">${a.atrPct ?? '--'}%</span></div>
    ${a.macd ? `<div class="stat-item"><span class="s-label">MACD柱</span><span class="s-val ${a.macd.hist >= 0 ? 'positive' : 'negative'}">${a.macd.hist}</span></div>` : ''}
  ` : '';

  document.getElementById('chartStats').innerHTML = `
    <div class="stat-item"><span class="s-label">开盘</span><span class="s-val">${fmtPrice(q.open, cur)}</span></div>
    <div class="stat-item"><span class="s-label">日高</span><span class="s-val">${fmtPrice(q.dayHigh, cur)}</span></div>
    <div class="stat-item"><span class="s-label">日低</span><span class="s-val">${fmtPrice(q.dayLow, cur)}</span></div>
    <div class="stat-item"><span class="s-label">昨收</span><span class="s-val">${fmtPrice(q.prevClose, cur)}</span></div>
    <div class="stat-item"><span class="s-label">成交量</span><span class="s-val">${fmtVol(q.volume)}</span></div>
    <div class="stat-item"><span class="s-label">均量比</span><span class="s-val">${volR}x</span></div>
    <div class="stat-item"><span class="s-label">市值</span><span class="s-val">${fmtMktCap(q.mktCap)}</span></div>
    <div class="stat-item"><span class="s-label">52W位置</span><span class="s-val">${rPos}%</span></div>
    ${aStats}
  `;
}

// ── Stock card ────────────────────────────────────────────────
function buildCard(sym, q) {
  if (!q) return `<div class="stock-card"><div class="card-sym">${sym}</div><div class="card-price muted">--</div></div>`;

  const chg    = fmtChg(q.change, q.pct);
  const rPos   = rangePos(q.price, q.low52, q.high52);
  const volRaw = q.avgVol > 0 ? q.volume / q.avgVol : 0;
  const volR   = volRaw.toFixed(2) + 'x';
  const volCls = volRaw > 3 ? 'very-high' : volRaw > 2 ? 'high' : '';
  const dirCls = q.pct >= 0 ? 'up' : 'down';

  return `
    <div class="stock-card ${dirCls}${sym === selectedSym ? ' selected' : ''}" data-sym="${sym}">
      <div class="card-sym">${sym.replace('^', '')}</div>
      <div class="card-name">${CN_NAMES[sym] || q.name}</div>
      <div class="card-price ${chg.cls}">${fmtPrice(q.price)}</div>
      <div class="card-chg ${chg.cls}">${chg.text}</div>
      <div class="card-footer">
        <div class="range-bar-wrap">
          <span>52W</span>
          <div class="range-bar"><div class="range-fill" style="width:${rPos}%"></div></div>
          <span>${rPos}%</span>
        </div>
        <div class="vol-row">
          <span>成交量 ${fmtVol(q.volume)}</span>
          <span class="vol-ratio ${volCls}">均量${volR}</span>
        </div>
      </div>
    </div>
  `;
}

// ── Main render ───────────────────────────────────────────────
function renderAll(data) {
  quoteData = data;
  const { quotes, symbols } = data;

  // ── Panic score (prefer multi-factor score from analytics)
  const score = analyticsData?.market?.panicScore ?? calculatePanic(quotes);
  const level = getPanicLevel(score);

  const canvas = document.getElementById('gaugeCanvas');
  drawGauge(canvas, score);
  document.getElementById('panicScore').textContent = score;
  document.getElementById('panicScore').style.color = level.color;
  document.getElementById('panicLabel').textContent  = level.label;
  document.getElementById('panicLabel').style.color  = level.color;
  document.getElementById('panicDesc').textContent   = level.desc;

  // ── VIX card
  const vix = quotes['^VIX'];
  if (vix) {
    const vChg = fmtChg(vix.change, vix.pct);
    document.getElementById('vixPrice').textContent    = fmtPrice(vix.price, '');
    document.getElementById('vixPrice').className      = 'stat-val ' + (vix.price > 30 ? 'negative' : vix.price < 18 ? 'positive' : 'neutral');
    document.getElementById('vixChange').textContent   = vChg.text;
    document.getElementById('vixChange').className     = 'stat-chg ' + vChg.cls;
  }

  // ── NASDAQ
  const nq = quotes['^IXIC'];
  if (nq) {
    const nChg = fmtChg(nq.change, nq.pct);
    document.getElementById('nasdaqPrice').textContent  = fmtPrice(nq.price, '');
    document.getElementById('nasdaqChange').textContent = nChg.text;
    document.getElementById('nasdaqChange').className   = 'stat-chg ' + nChg.cls;
    document.getElementById('nasdaqHint').textContent   =
      `开 ${fmtPrice(nq.open, '')} · 日高 ${fmtPrice(nq.dayHigh, '')} · 日低 ${fmtPrice(nq.dayLow, '')}`;
  }

  // ── S&P 500
  const sp = quotes['^GSPC'];
  if (sp) {
    const sChg = fmtChg(sp.change, sp.pct);
    document.getElementById('sp500Price').textContent  = fmtPrice(sp.price, '');
    document.getElementById('sp500Change').textContent = sChg.text;
    document.getElementById('sp500Change').className   = 'stat-chg ' + sChg.cls;
    document.getElementById('sp500Hint').textContent   =
      `开 ${fmtPrice(sp.open, '')} · 日高 ${fmtPrice(sp.dayHigh, '')} · 日低 ${fmtPrice(sp.dayLow, '')}`;
  }

  // ── Market status
  const anyQ   = Object.values(quotes)[0];
  const state  = anyQ?.state || 'REGULAR';
  const stateMap = {
    REGULAR:  { text:'美股交易中',  cls:'' },
    PRE:      { text:'盘前交易',    cls:'pre' },
    POST:     { text:'盘后交易',    cls:'post' },
    POSTPOST: { text:'盘后收盘',    cls:'post' },
    CLOSED:   { text:'市场已收盘',  cls:'closed' },
  };
  const sm = stateMap[state] || stateMap['REGULAR'];
  document.getElementById('statusText').textContent = sm.text;
  document.querySelector('.status-dot').className   = 'status-dot ' + sm.cls;

  // ── Stock grids
  document.getElementById('etfGrid').innerHTML  = symbols.etfs.map(s => buildCard(s, quotes[s])).join('');
  document.getElementById('mag7Grid').innerHTML = symbols.mag7.map(s => buildCard(s, quotes[s])).join('');
  document.getElementById('techGrid').innerHTML = symbols.tech.map(s => buildCard(s, quotes[s])).join('');

  // ── Last update
  document.getElementById('lastUpdate').textContent =
    '更新: ' + new Date().toLocaleTimeString('zh-CN');

  // ── Refresh chart stats (if chart is visible)
  renderChartStats(selectedSym);

  // Attach card click events
  document.querySelectorAll('.stock-card[data-sym], .stat-card[data-sym]').forEach(el => {
    el.addEventListener('click', () => {
      const sym = el.dataset.sym;
      if (!sym || sym === '^VIX') return;
      selectSymbol(sym);
    });
  });
}

function selectSymbol(sym) {
  selectedSym = sym;
  document.querySelectorAll('.stock-card.selected').forEach(el => el.classList.remove('selected'));
  document.querySelectorAll(`[data-sym="${sym}"]`).forEach(el => el.classList.add('selected'));
  loadChart(sym, selectedPeriod);
}

// ── Fetch quotes ──────────────────────────────────────────────
async function fetchQuotes() {
  try {
    const r = await fetch('/api/quotes');
    const d = await r.json();
    if (d.quotes) renderAll(d);
  } catch (e) {
    console.error('fetchQuotes:', e);
  }
}

// ── Clock ─────────────────────────────────────────────────────
function updateClock() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('zh-CN', { timeZone: 'America/New_York', hour12: false }) +
    ' ET';
}

// ── Bootstrap ─────────────────────────────────────────────────
async function init() {
  updateClock();
  setInterval(updateClock, 1000);

  initCharts();
  initSearch();
  initAsk();

  // Period button listeners
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedPeriod = btn.dataset.period;
      loadChart(selectedSym, selectedPeriod);
    });
  });

  // Initial fetch
  await fetchQuotes();
  await fetchAnalytics();

  // Load default chart
  await loadChart(selectedSym, selectedPeriod);

  // Auto-refresh: quotes every 15s, analytics every 5min
  setInterval(fetchQuotes, 15_000);
  setInterval(fetchAnalytics, 300_000);
}

// ════════════════════════════════════════════════════
//  Analytics (calculated indicators) rendering
// ════════════════════════════════════════════════════

function scaleColor(v) {
  if (v >= 75) return '#ef4444';
  if (v >= 55) return '#f97316';
  if (v >= 40) return '#eab308';
  if (v >= 20) return '#84cc16';
  return '#22c55e';
}

// Simple moving average → lightweight-charts line data
function maLine(candles, period) {
  const out = [];
  for (let i = period - 1; i < candles.length; i++) {
    let s = 0;
    for (let j = i - period + 1; j <= i; j++) s += candles[j].close;
    out.push({ time: candles[i].time, value: +(s / period).toFixed(4) });
  }
  return out;
}

async function fetchAnalytics() {
  try {
    const r = await fetch('/api/analytics');
    const d = await r.json();
    if (d.stocks) { analyticsData = d; renderAnalytics(d); }
  } catch (e) {
    console.error('fetchAnalytics:', e);
  }
}

function renderAnalytics(a) {
  // ── Multi-factor panic score → refresh gauge
  const score = a.market.panicScore;
  const level = getPanicLevel(score);
  drawGauge(document.getElementById('gaugeCanvas'), score);
  const ps = document.getElementById('panicScore');
  ps.textContent = score; ps.style.color = level.color;
  const pl = document.getElementById('panicLabel');
  pl.textContent = level.label; pl.style.color = level.color;
  document.getElementById('panicDesc').textContent = level.desc;

  // ── Factor breakdown bars
  const f = a.market.panicFactors;
  const items = [['VIX', f.vix], ['宽度', f.breadth], ['回撤', f.drawdown], ['波动', f.hv], ['新低', f.newLow], ['动量', f.momentum]];
  document.getElementById('panicFactors').innerHTML = items.map(([n, v]) =>
    `<div class="pf-row"><span class="pf-name">${n}</span><div class="pf-bar"><div class="pf-fill" style="width:${v}%;background:${scaleColor(v)}"></div></div><span class="pf-val">${v}</span></div>`
  ).join('');

  // ── Market structure cards
  const b = a.market.breadth;
  document.getElementById('breadthMain').textContent     = `${b.up} 涨 / ${b.down} 跌`;
  document.getElementById('breadthUpBar').style.width    = (b.total ? b.up / b.total * 100 : 0) + '%';
  document.getElementById('breadthDownBar').style.width  = (b.total ? b.down / b.total * 100 : 0) + '%';
  document.getElementById('breadthHint').textContent     = `${b.upPct}% 上涨 · ${b.flat} 只持平`;

  document.getElementById('newHigh').textContent = a.market.newHigh;
  document.getElementById('newLow').textContent  = a.market.newLow;

  const corr   = a.market.avgCorr;
  const corrEl = document.getElementById('avgCorr');
  corrEl.textContent = corr ?? '--';
  corrEl.className   = 'struct-main ' + (corr > 0.7 ? 'negative' : corr > 0.45 ? 'neutral' : 'positive');
  document.getElementById('corrHint').textContent = corr > 0.7
    ? '高度抱团，系统性下跌风险大'
    : corr > 0.45 ? '中度相关，部分联动' : '分化明显，个股逻辑主导';

  const hv  = a.market.marketHV, vix = a.market.vix;
  document.getElementById('marketHV').textContent  = hv + '%';
  document.getElementById('marketVix').textContent = vix.toFixed(1);
  const prem = +(vix - hv).toFixed(1);
  document.getElementById('hvHint').textContent = prem >= 0
    ? `VIX溢价 +${prem}：预期波动高于实际，留有缓冲`
    : `实际波动已超预期 ${prem}：风险或被低估`;

  renderRiskTable();
  renderLeverage(a.leverage);
}

function renderRiskTable() {
  const a = analyticsData;
  if (!a) return;

  const rows = Object.keys(a.stocks).map(sym => {
    const q = quoteData?.quotes?.[sym] || {};
    return { sym, name: CN_NAMES[sym] || q.name || sym, price: q.price ?? 0, pct: q.pct ?? 0, ...a.stocks[sym] };
  });

  const { key, dir } = riskSort;
  rows.sort((x, y) => {
    let xv = key === 'symbol' ? x.sym : x[key];
    let yv = key === 'symbol' ? y.sym : y[key];
    if (typeof xv === 'string') return dir === 'asc' ? xv.localeCompare(yv) : yv.localeCompare(xv);
    xv = xv ?? -Infinity; yv = yv ?? -Infinity;
    return dir === 'asc' ? xv - yv : yv - xv;
  });

  const sgn = v => v == null ? '--' : (v >= 0 ? '+' : '') + v;
  const body = rows.map(r => {
    let sig = '<span class="muted">--</span>';
    if (r.priceVs200 != null && r.priceVs200 < 0) sig = '<span class="sig-tag sig-below">跌破MA200</span>';
    else if (r.cross === 'golden') sig = '<span class="sig-tag sig-golden">金叉</span>';
    else if (r.cross === 'death')  sig = '<span class="sig-tag sig-death">死叉</span>';
    const streakTxt = r.streak === 0 ? '0' : (r.streak > 0 ? `连涨${r.streak}` : `连跌${-r.streak}`);
    return `<tr data-sym="${r.sym}" class="${r.sym === selectedSym ? 'selected' : ''}">
      <td>${r.sym.replace('^', '')}<span class="risk-row-name">${r.name}</span></td>
      <td>${fmtPrice(r.price)}</td>
      <td class="${r.pct >= 0 ? 'positive' : 'negative'}">${r.pct >= 0 ? '+' : ''}${r.pct.toFixed(2)}%</td>
      <td>${r.hv20}%</td>
      <td class="${r.beta > 1.2 ? 'negative' : r.beta < 0 ? 'positive' : ''}">${r.beta ?? '--'}</td>
      <td class="negative">${r.curDD}%</td>
      <td class="negative">${r.maxDD}%</td>
      <td class="negative">${r.var95}%</td>
      <td class="${r.priceVs200 >= 0 ? 'positive' : 'negative'}">${sgn(r.priceVs200)}%</td>
      <td>${r.atrPct ?? '--'}%</td>
      <td class="${r.streak >= 0 ? 'positive' : 'negative'}">${streakTxt}</td>
      <td>${sig}</td>
    </tr>`;
  }).join('');
  document.getElementById('riskTableBody').innerHTML = body;

  // Row → select symbol
  document.querySelectorAll('#riskTableBody tr').forEach(tr => {
    tr.onclick = () => selectSymbol(tr.dataset.sym);
  });
  // Header sort indicators + handlers
  document.querySelectorAll('#riskTable thead th[data-sort]').forEach(th => {
    th.classList.toggle('sorted-asc',  riskSort.key === th.dataset.sort && riskSort.dir === 'asc');
    th.classList.toggle('sorted-desc', riskSort.key === th.dataset.sort && riskSort.dir === 'desc');
    th.onclick = () => {
      if (riskSort.key === th.dataset.sort) riskSort.dir = riskSort.dir === 'asc' ? 'desc' : 'asc';
      else { riskSort.key = th.dataset.sort; riskSort.dir = th.dataset.sort === 'symbol' ? 'asc' : 'desc'; }
      renderRiskTable();
    };
  });
}

function renderLeverage(lv) {
  if (!lv) return;
  const card = (sym, desc, d, qqqRet) => {
    const maxAbs = Math.max(Math.abs(d.actual), Math.abs(d.theory), Math.abs(qqqRet), 1);
    const bar = (label, val, color) => `
      <div class="lev-bar-row"><span class="lev-bar-label">${label}</span>
        <div class="lev-bar-track"><div class="lev-bar-fill" style="width:${Math.abs(val) / maxAbs * 100}%;background:${color}"></div></div>
        <span class="lev-bar-val" style="color:${color}">${val >= 0 ? '+' : ''}${val}%</span></div>`;
    const excess = +(-d.decay).toFixed(1);   // 实际相对理论倍数的超额
    const good   = excess >= 0;
    return `<div class="lev-card">
      <div class="lev-head"><span class="lev-sym">${sym}</span><span class="lev-desc">${desc}</span></div>
      <div class="lev-bars">
        ${bar('QQQ 实际', qqqRet, qqqRet >= 0 ? 'var(--green)' : 'var(--red)')}
        ${bar('理论 ×3', d.theory, 'var(--blue)')}
        ${bar('实际表现', d.actual, d.actual >= 0 ? 'var(--green)' : 'var(--red)')}
      </div>
      <div class="lev-decay"><span>${good ? '跑赢理论倍数(复利增益)' : '波动损耗(跑输理论)'}</span>
        <span class="lev-decay-val" style="color:${good ? 'var(--green)' : 'var(--orange)'}">${good ? '+' : ''}${excess}%</span></div>
    </div>`;
  };
  let html = '';
  if (lv.tqqq) html += card('TQQQ', '3倍做多 QQQ', lv.tqqq, lv.qqqRet1y);
  if (lv.sqqq) html += card('SQQQ', '3倍做空 QQQ', lv.sqqq, lv.qqqRet1y);
  document.getElementById('leverageGrid').innerHTML = html;
}

// ════════════════════════════════════════════════════
//  Search command palette (⌘K / Ctrl+K)
// ════════════════════════════════════════════════════
let searchIndex   = [];
let searchMatches = [];
let searchActive  = 0;

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
}

function buildSearchIndex() {
  const items = [];
  const allSyms = [...SYMBOLS.indices, ...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech];
  for (const sym of allSyms) {
    const cn   = CN_NAMES[sym] || sym;
    const code = sym.replace('^', '');
    items.push({
      type: 'stock', sym,
      title: code, sub: cn,
      icon: sym.startsWith('^') ? '📊' : '◆',
      terms: [code, cn, ...(SEARCH_ALIASES[sym] || [])].map(s => s.toLowerCase()),
    });
  }
  for (const t of SEARCH_TERMS) {
    items.push({
      type: 'metric', target: t.target,
      title: t.name, sub: t.sub, icon: '◈',
      terms: [t.name, ...(t.kw || [])].map(s => s.toLowerCase()),
    });
  }
  searchIndex = items;
}

function runSearch(q) {
  const query = q.trim().toLowerCase();
  if (!query) {
    searchMatches = searchIndex.filter(i => i.type === 'stock');
  } else {
    searchMatches = searchIndex
      .filter(i => i.terms.some(t => t.includes(query)))
      .sort((a, b) => {
        const ap = a.terms.some(t => t.startsWith(query)) ? 0 : 1;
        const bp = b.terms.some(t => t.startsWith(query)) ? 0 : 1;
        return ap - bp;
      });
  }
  searchActive = 0;
  renderSearchResults(query);
}

function hl(text, q) {
  if (!q) return escapeHtml(text);
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return escapeHtml(text);
  return escapeHtml(text.slice(0, i)) +
         '<span class="si-hl">' + escapeHtml(text.slice(i, i + q.length)) + '</span>' +
         escapeHtml(text.slice(i + q.length));
}

// stocks first, then metrics — matches render order for keyboard nav
function orderedMatches() {
  return [...searchMatches.filter(i => i.type === 'stock'),
          ...searchMatches.filter(i => i.type === 'metric')];
}

function renderSearchResults(query) {
  const box = document.getElementById('searchResults');
  if (!searchMatches.length) {
    box.innerHTML = `<div class="search-empty"><div class="se-big">⊘</div>没有找到 “${escapeHtml(query)}” 相关的股票或指标</div>`;
    return;
  }
  const stocks  = searchMatches.filter(i => i.type === 'stock');
  const metrics = searchMatches.filter(i => i.type === 'metric');
  let idx = 0;
  const renderItem = it => {
    const i = idx++;
    const tagCls = it.type === 'stock' ? 'stock' : 'metric';
    const tagTxt = it.type === 'stock' ? '股票' : '指标';
    return `<div class="search-item ${i === searchActive ? 'active' : ''}" data-idx="${i}">
      <span class="si-icon">${it.icon}</span>
      <div class="si-body">
        <div class="si-main">${hl(it.title, query)}</div>
        <div class="si-sub">${hl(it.sub, query)}</div>
      </div>
      <span class="si-tag ${tagCls}">${tagTxt}</span>
    </div>`;
  };
  let html = '';
  if (stocks.length)  html += `<div class="search-group-title">股票 / 指数 · ${stocks.length}</div>` + stocks.map(renderItem).join('');
  if (metrics.length) html += `<div class="search-group-title">指标 / 板块 · ${metrics.length}</div>` + metrics.map(renderItem).join('');
  box.innerHTML = html;

  box.querySelectorAll('.search-item').forEach(el => {
    el.addEventListener('click',     () => { searchActive = +el.dataset.idx; execSearchActive(); });
    el.addEventListener('mousemove', () => setActive(+el.dataset.idx));
  });
}

function setActive(i) {
  const items = document.querySelectorAll('#searchResults .search-item');
  if (!items.length) return;
  searchActive = Math.max(0, Math.min(i, items.length - 1));
  items.forEach((el, k) => el.classList.toggle('active', k === searchActive));
  items[searchActive]?.scrollIntoView({ block: 'nearest' });
}

function execSearchActive() {
  const it = orderedMatches()[searchActive];
  if (!it) return;
  closeSearch();
  if (it.type === 'stock') {
    selectSymbol(it.sym);
    setTimeout(() => jumpToSection('sec-chart'), 80);
  } else {
    jumpToSection(it.target);
  }
}

function jumpToSection(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  el.classList.remove('flash-highlight');
  void el.offsetWidth;                 // force reflow to restart animation
  el.classList.add('flash-highlight');
  setTimeout(() => el.classList.remove('flash-highlight'), 1500);
}

function openSearch() {
  const ov  = document.getElementById('searchOverlay');
  const inp = document.getElementById('searchInput');
  ov.classList.add('open');
  inp.value = '';
  runSearch('');
  setTimeout(() => inp.focus(), 30);
}
function closeSearch() {
  document.getElementById('searchOverlay').classList.remove('open');
}

function initSearch() {
  buildSearchIndex();
  const trigger = document.getElementById('searchTrigger');
  const overlay = document.getElementById('searchOverlay');
  const input   = document.getElementById('searchInput');

  trigger?.addEventListener('click', openSearch);
  input?.addEventListener('input', e => runSearch(e.target.value));
  overlay?.addEventListener('click', e => { if (e.target === overlay) closeSearch(); });

  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openSearch(); return; }
    if (!overlay.classList.contains('open')) return;
    if      (e.key === 'Escape')    closeSearch();
    else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(searchActive + 1); }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(searchActive - 1); }
    else if (e.key === 'Enter')     { e.preventDefault(); execSearchActive(); }
  });

  // Open search directly via #search hash or ?search query (shareable deep-link)
  if (location.hash === '#search' || location.search.includes('search')) setTimeout(openSearch, 400);
}

// ════════════════════════════════════════════════════
//  Ask AI — 基于当前页面实时数据的问答(后端调 DeepSeek)
// ════════════════════════════════════════════════════
let askBusy = false;

// 收集当前页面的关键数据，作为 AI 的上下文
function buildPageContext() {
  const q = quoteData?.quotes || {};
  const a = analyticsData || {};
  const m = a.market || {};
  const allSyms = [...SYMBOLS.indices, ...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech];

  const 行情 = allSyms.map(s => {
    const x = q[s]; if (!x) return null;
    return { 代码: s.replace('^',''), 名称: CN_NAMES[s] || s, 价格: x.price, 涨跌幅: x.pct != null ? +x.pct.toFixed(2) : null };
  }).filter(Boolean);

  const 风险指标 = {};
  if (a.stocks) for (const s of Object.keys(a.stocks)) {
    const r = a.stocks[s];
    风险指标[s.replace('^','')] = { HV20: r.hv20, Beta: r.beta, 当前回撤: r.curDD, 最大回撤: r.maxDD, VaR95: r.var95, 距MA200: r.priceVs200, 连涨跌天: r.streak };
  }

  return {
    恐慌指数_0到100越高越恐慌: m.panicScore,
    恐慌因子明细: m.panicFactors,
    VIX: m.vix,
    市场宽度: m.breadth,
    今日新高数: m.newHigh, 今日新低数: m.newLow,
    平均相关性: m.avgCorr,
    大盘历史波动率HV: m.marketHV,
    杠杆ETF衰减: a.leverage,
    选中股票: selectedSym ? selectedSym.replace('^','') : null,
    行情, 风险指标,
  };
}

function askRenderIntro() {
  const box = document.getElementById('askMessages');
  box.innerHTML = `
    <div class="ask-intro">
      <div class="ai-big">✦</div>
      <h3>问我关于当前市场的问题</h3>
      <p>我会基于这个页面上的实时数据，<br>用通俗的话帮你解读。</p>
      <div class="ask-chips">
        <button class="ask-chip">现在算恐慌吗？</button>
        <button class="ask-chip">哪只股票风险最高？</button>
        <button class="ask-chip">恐慌指数是怎么算的？</button>
        <button class="ask-chip">用一句话总结今天行情</button>
      </div>
    </div>`;
  box.querySelectorAll('.ask-chip').forEach(c =>
    c.addEventListener('click', () => { document.getElementById('askInput').value = c.textContent; askSubmit(); }));
}

function askAddMessage(role, html) {
  const box = document.getElementById('askMessages');
  box.querySelector('.ask-intro')?.remove();
  const wrap = document.createElement('div');
  wrap.className = 'ask-msg ' + role;
  wrap.innerHTML = `<div class="m-avatar">${role === 'ai' ? '✦' : '🙂'}</div><div class="bubble">${html}</div>`;
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
  return wrap;
}

function mdToHtml(text) {
  let h = escapeHtml(text);
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  return h.split(/\n\n+/).map(p => '<p>' + p.replace(/\n/g, '<br>') + '</p>').join('');
}

async function askSubmit() {
  if (askBusy) return;
  const input = document.getElementById('askInput');
  const question = input.value.trim();
  if (!question) return;
  input.value = ''; input.style.height = 'auto';
  askAddMessage('user', escapeHtml(question));

  askBusy = true;
  const sendBtn = document.getElementById('askSend');
  sendBtn.disabled = true;
  const aiMsg = askAddMessage('ai', '<div class="ask-typing"><span></span><span></span><span></span></div>');

  try {
    const r = await fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, context: buildPageContext() }),
    });
    const data = await r.json();
    aiMsg.querySelector('.bubble').innerHTML = data.answer
      ? mdToHtml(data.answer)
      : mdToHtml(data.error || 'AI 暂时无法回答，请稍后再试。');
  } catch (e) {
    aiMsg.querySelector('.bubble').innerHTML = '网络错误，请稍后再试。';
  } finally {
    askBusy = false;
    sendBtn.disabled = false;
    const box = document.getElementById('askMessages');
    box.scrollTop = box.scrollHeight;
  }
}

function openAsk() {
  document.getElementById('askOverlay').classList.add('open');
  setTimeout(() => document.getElementById('askInput').focus(), 60);
}
function closeAsk() { document.getElementById('askOverlay').classList.remove('open'); }

function initAsk() {
  document.getElementById('askTrigger')?.addEventListener('click', openAsk);
  document.getElementById('askClose')?.addEventListener('click', closeAsk);
  document.getElementById('askOverlay')?.addEventListener('click', e => { if (e.target.id === 'askOverlay') closeAsk(); });
  document.getElementById('askSend')?.addEventListener('click', askSubmit);

  const input = document.getElementById('askInput');
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askSubmit(); }
  });
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('askOverlay').classList.contains('open')) closeAsk();
  });
  askRenderIntro();
  if (location.hash === '#ask' || location.search.includes('ask')) setTimeout(openAsk, 400);
}

document.addEventListener('DOMContentLoaded', init);
