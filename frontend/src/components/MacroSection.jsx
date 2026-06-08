import { useEffect, useState } from 'react'

const GROUP_LABELS = {
  futures: '期货',
  metals:  '贵金属',
  energy:  '原油',
  bonds:   '美债',
  forex:   '外汇',
}
const GROUP_COLORS = {
  futures: '#6aa3ff',
  metals:  '#f5c84b',
  energy:  '#ff8c42',
  bonds:   '#a78bfa',
  forex:   '#34d399',
}
// 涨跌对大盘的解读：key=sym, up/dn message
const SIGNAL_MSG = {
  'ES=F':     { up: '期货看涨，明日可能高开', dn: '期货看跌，明日可能低开' },
  'NQ=F':     { up: '科技股期货偏强', dn: '科技股期货偏弱' },
  '^TNX':     { dn: '收益率上升，成长股承压', up: '收益率下行，利好科技估值' },
  'EURUSD=X': { up: '美元走弱，新兴市场压力减轻', dn: '美元走强，大宗商品受压' },
}

function fmt(q) {
  const s = q.symbol
  if (s === '^TNX') return q.price.toFixed(3) + '%'
  if (s?.includes('=X')) {
    if (s === 'USDJPY=X') return q.price.toFixed(2)
    return q.price.toFixed(4)
  }
  if (q.price >= 1000) return q.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return q.price.toFixed(2)
}

function MacroTile({ q, group }) {
  if (!q) return <div className="macro-tile macro-tile-empty">—</div>
  const up = q.pct >= 0
  const sig = SIGNAL_MSG[q.symbol]
  const color = GROUP_COLORS[group]
  return (
    <div
      className={`macro-tile${up ? ' macro-up' : ' macro-dn'}`}
      style={{ '--g': color }}
      title={sig ? (up ? sig.up : sig.dn) : ''}
    >
      <div className="macro-tile-top">
        <span className="macro-sym">{q.symbol.replace('^', '').replace('=X', '')}</span>
        <span className="macro-gdot" />
      </div>
      <div className="macro-cn">{q.cnName}</div>
      <div className="macro-price">{fmt(q)}</div>
      <div className={`macro-chg ${up ? 'positive' : 'negative'}`}>
        {up ? '▲' : '▼'} {Math.abs(q.pct).toFixed(2)}%
      </div>
    </div>
  )
}

export default function MacroSection() {
  const [data, setData] = useState(null)
  const [age, setAge] = useState(0)

  const load = async () => {
    try {
      const r = await fetch('/api/macro')
      const d = await r.json()
      if (d.quotes) { setData(d); setAge(0) }
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    const tick = setInterval(() => setAge(a => a + 1), 1000)
    return () => { clearInterval(t); clearInterval(tick) }
  }, [])

  if (!data) return (
    <div className="macro-loading">
      <span className="macro-spinner" />正在拉取期货、大宗、外汇数据…
    </div>
  )

  // 展平为连续瓦片流，组信息靠顶部色条 + cnName 体现
  const tiles = []
  Object.entries(data.groups).forEach(([key, syms]) => {
    syms.forEach(sym => { if (data.quotes[sym]) tiles.push({ sym, group: key }) })
  })

  return (
    <div className="macro-wrap">
      <div className="macro-legend">
        {Object.entries(GROUP_LABELS).map(([key, label]) => (
          <span key={key} className="macro-leg-item">
            <span className="macro-leg-dot" style={{ background: GROUP_COLORS[key] }} />
            {label}
          </span>
        ))}
      </div>

      <div className="macro-grid">
        {tiles.map(t => <MacroTile key={t.sym} q={data.quotes[t.sym]} group={t.group} />)}
      </div>

      <div className="macro-footer">
        <span>数据来源 Yahoo Finance · {age}s 前更新</span>
        <span>10年期美债收益率越高 = 融资成本越贵，科技股承压</span>
        <span>期货在美股休市后仍交易，反映明日开盘预期</span>
      </div>
    </div>
  )
}
