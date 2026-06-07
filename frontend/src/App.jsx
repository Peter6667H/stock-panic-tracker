import { useState, useEffect, useCallback } from 'react'
import { SYMBOLS } from './lib/constants.js'
import { calculatePanic } from './lib/utils.js'
import SiteNav from './components/SiteNav.jsx'
import Hero from './components/Hero.jsx'
import Section from './components/Section.jsx'
import MyPanicSection from './components/MyPanicSection.jsx'
import PortfolioModal from './components/PortfolioModal.jsx'
import StructureSection from './components/StructureSection.jsx'
import StockSection from './components/StockSection.jsx'
import RiskTable from './components/RiskTable.jsx'
import LeverageSection from './components/LeverageSection.jsx'
import ChartSection from './components/ChartSection.jsx'
import AiInsight from './components/AiInsight.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import AskPanel from './components/AskPanel.jsx'

const jump = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

export default function App() {
  const [quoteData, setQuoteData]       = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedSym, setSelectedSym]   = useState('AAPL')
  const [selectedPeriod, setSelectedPeriod] = useState('1y')
  const [marketState, setMarketState]   = useState('REGULAR')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [askOpen, setAskOpen]           = useState(false)
  const [portfolioOpen, setPortfolioOpen] = useState(false)
  const [holdingsVersion, setHoldingsVersion] = useState(0)

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

  // 锚点深链：带 #区块 打开时滚动到对应区（可分享 /#leaders 等）
  useEffect(() => {
    const id = location.hash.replace('#', '')
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 300)
  }, [])

  const quotes = quoteData?.quotes || {}
  const panicScore = analyticsData?.market?.panicScore ?? calculatePanic(quotes)

  // 选股票并滑到图表 —— 网站式联动
  const pickSym = useCallback(sym => {
    setSelectedSym(sym)
    setTimeout(() => jump('chart'), 60)
  }, [])

  return (
    <>
      <SiteNav
        marketState={marketState}
        onSearchOpen={() => setSearchOpen(true)}
        onAskOpen={() => setAskOpen(true)}
      />

      <Hero
        quotes={quotes}
        panicScore={panicScore}
        onSelectSym={pickSym}
        onJump={jump}
      />

      <main className="site-main">
        <Section
          id="mypanic" num="01" eyebrow="个人化恐慌系数"
          title="市场在慌，你该慌吗？"
          sub="录入持仓，结合市场情绪 × 你的仓位风险 × 历史习惯，算出真正属于你的恐慌分。"
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
          id="leaders" num="03" eyebrow="龙头股 · 实时"
          title="牵动大盘的那几只"
          sub="杠杆 ETF、科技七姐妹、半导体核心股。点任意一只，下方图表即时联动。"
        >
          <StockSection title="杠杆 ETF" sub="QQQ · TQQQ · SQQQ"
            syms={SYMBOLS.etfs} quotes={quotes} selectedSym={selectedSym} onSelectSym={pickSym} bare />
          <StockSection title="科技七姐妹 · Mag 7" sub="七大科技龙头"
            syms={SYMBOLS.mag7} quotes={quotes} selectedSym={selectedSym} onSelectSym={pickSym} bare />
          <StockSection title="半导体 / 科技股" sub="美光 · AMD · 英特尔"
            syms={SYMBOLS.tech} quotes={quotes} selectedSym={selectedSym} onSelectSym={pickSym} bare />
        </Section>

        <Section
          id="risk" num="04" eyebrow="风险矩阵"
          title="谁的风险最高？"
          sub="HV、Beta、回撤、VaR、ATR 一览。点列头排序，点行看图。"
        >
          <RiskTable analyticsData={analyticsData} quoteData={quoteData}
            selectedSym={selectedSym} onSelectSym={pickSym} bare />
          <LeverageSection analyticsData={analyticsData} bare />
        </Section>

        <Section
          id="chart" num="05" eyebrow="个股图表"
          title="放大看走势"
          sub="最长 20 年 K 线 + 均线 + RSI + 成交量。点上方任意股票即可切换。"
        >
          <ChartSection
            selectedSym={selectedSym}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            quoteData={quoteData}
            analyticsData={analyticsData}
          />
        </Section>

        <Section
          id="ai" num="06" eyebrow="AI 洞察"
          title="让 AI 帮你读盘"
          sub="基于实时数据与财经新闻，用大白话解释为什么涨跌、现在该不该慌。"
        >
          <AiInsight
            quotes={quotes}
            analyticsData={analyticsData}
            panicScore={panicScore}
            onAskOpen={() => setAskOpen(true)}
            bare
          />
        </Section>
      </main>

      <footer className="site-footer-lg">
        <div className="footer-inner">
          <div className="footer-brand">PANIC<span>·INDEX</span></div>
          <p className="footer-tag">实时美股市场情绪监控 · 数据来源 Yahoo Finance（延迟约15秒）</p>
          <p className="footer-disc">本工具仅供参考，不构成任何投资建议。市场有风险，决策需谨慎。</p>
          <button className="footer-top" onClick={() => jump('hero')}>回到顶部 ↑</button>
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
        onSelectSym={sym => { pickSym(sym); setSearchOpen(false) }}
      />
      <AskPanel
        open={askOpen}
        onClose={() => setAskOpen(false)}
        quoteData={quoteData}
        analyticsData={analyticsData}
        selectedSym={selectedSym}
      />
    </>
  )
}
