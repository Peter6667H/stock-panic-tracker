export const SYMBOLS = {
  indices: ['^IXIC', '^GSPC', '^VIX'],
  etfs:    ['QQQ', 'TQQQ', 'SQQQ'],
  mag7:    ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA'],
  tech:    ['MU', 'AMD', 'INTC'],
}

export const CN_NAMES = {
  '^IXIC':'纳斯达克综合', '^GSPC':'标普500', '^VIX':'VIX恐慌指数',
  'QQQ':'QQQ 纳指ETF',   'TQQQ':'TQQQ 3倍做多', 'SQQQ':'SQQQ 3倍做空',
  'AAPL':'苹果',  'MSFT':'微软', 'GOOGL':'谷歌', 'AMZN':'亚马逊',
  'META':'Meta',  'NVDA':'英伟达', 'TSLA':'特斯拉',
  'MU':'美光科技', 'AMD':'AMD', 'INTC':'英特尔',
}

export const SECTORS = {
  '^IXIC':'综合指数', '^GSPC':'宽基指数', '^VIX':'波动率',
  'QQQ':'纳指ETF', 'TQQQ':'3倍做多', 'SQQQ':'3倍做空',
  'AAPL':'消费电子', 'MSFT':'软件云', 'GOOGL':'互联网',
  'AMZN':'电商云', 'META':'社交平台', 'NVDA':'AI芯片', 'TSLA':'电动车',
  'MU':'存储芯片', 'AMD':'半导体', 'INTC':'半导体',
}

export const PANIC_LEVELS = [
  { min:80, label:'极度恐慌', desc:'市场崩盘模式，极端超卖', color:'#ef4444' },
  { min:60, label:'恐慌',     desc:'大量抛售，情绪极度悲观', color:'#f97316' },
  { min:40, label:'担忧',     desc:'市场情绪负面，需谨慎',   color:'#eab308' },
  { min:20, label:'中性',     desc:'市场平稳运行',           color:'#84cc16' },
  { min:0,  label:'乐观',     desc:'市场积极，情绪高涨',     color:'#22c55e' },
]

export const SEARCH_ALIASES = {
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
}

export const SEARCH_TERMS = [
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
]
