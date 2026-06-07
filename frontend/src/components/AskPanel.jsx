import { useState, useEffect, useRef } from 'react'
import { SYMBOLS, CN_NAMES } from '../lib/constants.js'

function buildPageContext(quoteData, analyticsData, selectedSym) {
  const q = quoteData?.quotes || {}
  const a = analyticsData || {}
  const m = a.market || {}
  const allSyms = [...SYMBOLS.indices, ...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech]

  const 行情 = allSyms.map(s => {
    const x = q[s]; if (!x) return null
    return { 代码: s.replace('^',''), 名称: CN_NAMES[s] || s, 价格: x.price, 涨跌幅: x.pct != null ? +x.pct.toFixed(2) : null }
  }).filter(Boolean)

  const 风险指标 = {}
  if (a.stocks) for (const s of Object.keys(a.stocks)) {
    const r = a.stocks[s]
    风险指标[s.replace('^','')] = { HV20: r.hv20, Beta: r.beta, 当前回撤: r.curDD, 最大回撤: r.maxDD, VaR95: r.var95, 距MA200: r.priceVs200, 连涨跌天: r.streak }
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
  }
}

// Convert bold markdown to spans safely (no dangerouslySetInnerHTML)
function MarkdownText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : <span key={i}>{part}</span>
      )}
    </>
  )
}

function AiAnswer({ text }) {
  const paragraphs = text.split(/\n\n+/)
  return (
    <>
      {paragraphs.map((para, i) => (
        <p key={i}>
          {para.split('\n').map((line, j) => (
            <span key={j}>{j > 0 && <br />}<MarkdownText text={line} /></span>
          ))}
        </p>
      ))}
    </>
  )
}

const CHIPS = ['现在算恐慌吗？', '哪只股票风险最高？', '恐慌指数是怎么算的？', '用一句话总结今天行情']

export default function AskPanel({ open, onClose, quoteData, analyticsData, selectedSym }) {
  const [messages, setMessages] = useState([])
  const [inputVal, setInputVal] = useState('')
  const [busy, setBusy]         = useState(false)
  const inputRef  = useRef(null)
  const msgBoxRef = useRef(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (open) {
      if (!initialized.current) initialized.current = true
      setTimeout(() => inputRef.current?.focus(), 60)
    }
  }, [open])

  useEffect(() => {
    if (msgBoxRef.current) msgBoxRef.current.scrollTop = msgBoxRef.current.scrollHeight
  }, [messages])

  useEffect(() => {
    const onKey = e => {
      if (e.key === 'Escape' && open) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const submit = async (question) => {
    if (busy || !question.trim()) return
    setInputVal('')
    setMessages(prev => [...prev, { role: 'user', text: question }])
    setBusy(true)
    setMessages(prev => [...prev, { role: 'ai', loading: true }])

    try {
      const r = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context: buildPageContext(quoteData, analyticsData, selectedSym) }),
      })
      const data = await r.json()
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'ai', text: data.answer || data.error || 'AI 暂时无法回答，请稍后再试。' }
        return next
      })
    } catch {
      setMessages(prev => {
        const next = [...prev]
        next[next.length - 1] = { role: 'ai', text: '网络错误，请稍后再试。' }
        return next
      })
    } finally {
      setBusy(false)
    }
  }

  const onInputKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(inputVal) }
  }

  if (!open) return null

  const showIntro = messages.length === 0

  return (
    <div className="ask-overlay open" onClick={e => { if (e.target.id === 'askOverlayRoot') onClose() }}>
      <div id="askOverlayRoot" style={{ position:'fixed', inset:0 }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="ask-panel" role="dialog" aria-modal="true" aria-label="问 AI">
          <div className="ask-header">
            <div className="ask-avatar">✦</div>
            <div className="ask-htext">
              <div className="ask-htitle">问 AI</div>
              <div className="ask-hsub">基于当前页面实时数据回答</div>
            </div>
            <button className="ask-close" onClick={onClose} aria-label="关闭">×</button>
          </div>

          <div className="ask-messages" ref={msgBoxRef}>
            {showIntro && (
              <div className="ask-intro">
                <div className="ai-big">✦</div>
                <h3>问我关于当前市场的问题</h3>
                <p>我会基于这个页面上的实时数据，<br />用通俗的话帮你解读。</p>
                <div className="ask-chips">
                  {CHIPS.map(c => (
                    <button key={c} className="ask-chip" onClick={() => submit(c)}>{c}</button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`ask-msg ${msg.role}`}>
                <div className="m-avatar">{msg.role === 'ai' ? '✦' : '🙂'}</div>
                <div className="bubble">
                  {msg.loading
                    ? <div className="ask-typing"><span /><span /><span /></div>
                    : msg.role === 'ai' ? <AiAnswer text={msg.text} /> : msg.text
                  }
                </div>
              </div>
            ))}
          </div>

          <div className="ask-input-row">
            <textarea
              ref={inputRef}
              className="ask-input"
              rows={1}
              placeholder="问问当前市场… 比如：现在算恐慌吗？"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              onKeyDown={onInputKey}
              onInput={e => {
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
              }}
            />
            <button className="ask-send" disabled={busy} onClick={() => submit(inputVal)} aria-label="发送">➤</button>
          </div>
          <div className="ask-disclaimer">AI 基于实时数据生成，仅供参考，不构成投资建议</div>
        </div>
      </div>
    </div>
  )
}
