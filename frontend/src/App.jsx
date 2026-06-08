import { useState, useEffect, useCallback } from 'react'
import { calculatePanic } from './lib/utils.js'
import { CN_NAMES } from './lib/constants.js'
import { getHoldings, setHoldings } from './lib/portfolio.js'
import SiteNav from './components/SiteNav.jsx'
import Terminal from './components/Terminal.jsx'
import ContextMenu from './components/ContextMenu.jsx'
import Section from './components/Section.jsx'
import MyPanicSection from './components/MyPanicSection.jsx'
import PortfolioModal from './components/PortfolioModal.jsx'
import StructureSection from './components/StructureSection.jsx'
import RiskTable from './components/RiskTable.jsx'
import LeverageSection from './components/LeverageSection.jsx'
import AiInsight from './components/AiInsight.jsx'
import MacroSection from './components/MacroSection.jsx'
import TrumpFeed from './components/TrumpFeed.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import AskPanel from './components/AskPanel.jsx'

const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function App() {
  const [quoteData, setQuoteData]       = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedSym, setSelectedSym]   = useState('NVDA')
  const [selectedPeriod, setSelectedPeriod] = useState('1y')
  const [marketState, setMarketState]   = useState('REGULAR')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [askOpen, setAskOpen]           = useState(false)
  const [askStockFocus, setAskStockFocus] = useState(null)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [holdingsVersion, setHoldingsVersion] = useState(0)
  const [ctxMenu, setCtxMenu]           = useState(null)  // { sym, x, y }

  const fetchQuotes = useCallback(async () => {
    try {
      const r = await fetch('/api/quotes')
      const d = await r.json()
      if (d.quotes) {
        setQuoteData(d)
        const anyQ = Object.values(d.quotes)[0]
        setMarketState(anyQ?.state || 'REGULAR')
      }
    } catch (e) { console.error('fetchQuotes:', e) }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const r = await fetch('/api/analytics')
      const d = await r.json()
      if (d.stocks) setAnalyticsData(d)
    } catch (e) { console.error('fetchAnalytics:', e) }
  }, [])

  useEffect(() => {
    fetchQuotes()
    fetchAnalytics()
    const q = setInterval(fetchQuotes, 15_000)
    const a = setInterval(fetchAnalytics, 300_000)
    return () => { clearInterval(q); clearInterval(a) }
  }, [fetchQuotes, fetchAnalytics])

  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault(); setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // 锚点深链
  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 300)
  }, [])

  const quotes = quoteData?.quotes || {}
  const panicScore = analyticsData?.market?.panicScore ?? calculatePanic(quotes)

  const pickSym = useCallback(sym => { setSelectedSym(sym) }, [])

  const openStockAI = useCallback(sym => {
    setSelectedSym(sym)
    setAskStockFocus(sym)
    setAskOpen(true)
  }, [])

  const openGeneralAI = useCallback(() => {
    setAskStockFocus(null)
    setAskOpen(true)
  }, [])

  // 右键个股 → 上下文菜单
  const openContextStock = useCallback((sym, e) => {
    e.preventDefault()
    setCtxMenu({ sym, x: e.clientX, y: e.clientY })
  }, [])

  const removeHolding = useCallback(sym => {
    setHoldings(getHoldings().filter(h => h.sym !== sym))
    setHoldingsVersion(v => v + 1)
  }, [])

  // 构建右键菜单项（依赖当前持仓状态）
  const ctxItems = ctxMenu ? (() => {
    const sym = ctxMenu.sym
    const code = sym.replace('^', '')
    const held = getHoldings().some(h => h.sym === sym)
    const isIndex = sym.startsWith('^')
    return [
      { icon: '✦', label: 'DeepSeek 深度分析', onClick: () => openStockAI(sym) },
      { icon: '📈', label: '设为主图 / 看K线', onClick: () => pickSym(sym) },
      { sep: true },
      { icon: '💼', label: held ? '编辑持仓 / 成本' : '加入持仓', disabled: isIndex,
        onClick: () => setPortfolioOpen(true) },
      { icon: '✕', label: '取消持仓', danger: true, disabled: !held,
        onClick: () => removeHolding(sym) },
      { sep: true },
      { icon: '⧉', label: '复制代码', onClick: () => { try { navigator.clipboard?.writeText(code) } catch {} } },
    ]
  })() : []

  return (
    <>
      <SiteNav
        marketState={marketState}
        onSearchOpen={() => setSearchOpen(true)}
        onAskOpen={openGeneralAI}
      />

      <Terminal
        quotes={quotes}
        quoteData={quoteData}
        analyticsData={analyticsData}
        panicScore={panicScore}
        selectedSym={selectedSym}
        onSelectSym={pickSym}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        onAskAI={openStockAI}
        onContextStock={openContextStock}
      />

      <main className="site-main">
        <Section
          id="mypanic" num="01" eyebrow="组合体检 · 压力测试"
          title="大盘跌 20%，你扛得住吗？"
          sub="录入持仓，用各股 β 做压力测试：浮亏多少、哪只先破成本、有效杠杆与集中度——全是硬数字。"
        >
          <MyPanicSection
            quotes={quotes}
            analytics={analyticsData}
            marketScore={panicScore}
            holdingsVersion={holdingsVersion}
            onEdit={() => setPortfolioOpen(true)}
          />
        </Section>

        <Section
          id="overview" num="02" eyebrow="市场结构 · 情绪"
          title="是系统性恐慌，还是局部回调？"
          sub="市场宽度、52周新高新低、相关性、波动溢价——四个角度判断这次下跌的性质。"
        >
          <StructureSection analyticsData={analyticsData} bare />
        </Section>

        <Section
          id="macro" num="03" eyebrow="宏观指标 · 全球视野"
          title="期货、大宗、美债、外汇"
          sub="标普期货反映明日开盘预期，金油走势揭示避险情绪，美债收益率决定科技股估值，外汇折射美元强弱。"
        >
          <MacroSection />
          <TrumpFeed />
        </Section>

        <Section
          id="risk" num="04" eyebrow="风险矩阵"
          title="谁的风险最高？"
          sub="HV、Beta、回撤、VaR、ATR 一览。点列头排序，点行联动上方看盘终端。"
        >
          <RiskTable analyticsData={analyticsData} quoteData={quoteData}
            selectedSym={selectedSym} onSelectSym={pickSym} bare />
          <LeverageSection analyticsData={analyticsData} bare />
        </Section>

        <Section
          id="ai" num="05" eyebrow="AI 洞察"
          title="让 AI 帮你读盘"
          sub="基于实时数据与财经新闻，用大白话解释为什么涨跌、现在该不该慌。"
        >
          <AiInsight
            quotes={quotes}
            analyticsData={analyticsData}
            panicScore={panicScore}
            onAskOpen={openGeneralAI}
            bare
          />
        </Section>
      </main>

      <footer className="site-footer-lg">
        <div className="footer-inner">
          <div className="footer-brand">PANIC<span>·INDEX</span></div>
          <p className="footer-tag">实时美股市场情绪监控 · 数据来源 Yahoo Finance（延迟约15秒）</p>
          <p className="footer-disc">本工具仅供参考，不构成任何投资建议。市场有风险，决策需谨慎。</p>
          <button className="footer-top" onClick={() => jump('terminal')}>回到顶部 ↑</button>
        </div>
      </footer>

      <PortfolioModal
        open={portfolioOpen}
        onClose={() => setPortfolioOpen(false)}
        onSaved={() => setHoldingsVersion(v => v + 1)}
        quotes={quotes}
      />
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectSym={sym => { pickSym(sym); setSearchOpen(false); jump('terminal') }}
      />
      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        quoteData={quoteData}
        analyticsData={analyticsData}
        selectedSym={selectedSym}
        stockFocus={askStockFocus}
      />
      {ctxMenu && (
        <ContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          title={`${ctxMenu.sym.replace('^', '')} · ${CN_NAMES[ctxMenu.sym] || ''}`}
          items={ctxItems}
          onClose={() => setCtxMenu(null)}
        />
      )}
    </>
  )
}
