import { useState, useEffect } from 'react'

const STATE_MAP = {
  REGULAR:  { text:'美股交易中',  cls:'' },
  PRE:      { text:'盘前交易',    cls:'pre' },
  POST:     { text:'盘后交易',    cls:'post' },
  POSTPOST: { text:'盘后收盘',    cls:'post' },
  CLOSED:   { text:'市场已收盘',  cls:'closed' },
}

export default function Header({ marketState, lastUpdate, onSearchOpen, onAskOpen }) {
  const [clock, setClock] = useState('')

  useEffect(() => {
    const tick = () => setClock(
      new Date().toLocaleTimeString('zh-CN', { timeZone: 'America/New_York', hour12: false }) + ' ET'
    )
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const sm = STATE_MAP[marketState] || STATE_MAP['REGULAR']

  return (
    <header className="site-header">
      <div className="header-left">
        <span className="logo">📉</span>
        <div>
          <h1>美股恐慌指数仪表盘</h1>
          <p className="header-sub">实时市场情绪监控 · 涵盖纳指 / 标普500 / Mag7 / 科技股</p>
        </div>
      </div>
      <div className="header-right">
        <button className="search-trigger" onClick={onSearchOpen} aria-label="搜索股票或指标">
          <span className="st-icon">⌕</span>
          <span className="st-text">搜索股票 / 指标…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <button className="ask-trigger" onClick={onAskOpen}>
          <span className="ai-spark">✦</span>
          <span className="at-text">问 AI</span>
        </button>
        <div className="market-status">
          <span className={`status-dot ${sm.cls}`}></span>
          <span>{sm.text}</span>
        </div>
        <div className="clock">{clock}</div>
        <div className="refresh-info">
          <span>{lastUpdate}</span>
        </div>
      </div>
    </header>
  )
}
