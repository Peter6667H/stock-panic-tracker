import { useState, useEffect, useCallback } from 'react'
import { SYMBOLS, CN_NAMES } from './lib/constants.js'
import { getPanicLevel, calculatePanic, fmtPrice, scaleColor } from './lib/utils.js'
import Header from './components/Header.jsx'
import PanicSection from './components/PanicSection.jsx'
import StructureSection from './components/StructureSection.jsx'
import StockSection from './components/StockSection.jsx'
import RiskTable from './components/RiskTable.jsx'
import LeverageSection from './components/LeverageSection.jsx'
import ChartSection from './components/ChartSection.jsx'
import AiInsight from './components/AiInsight.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import AskPanel from './components/AskPanel.jsx'

export default function App() {
  const [quoteData, setQuoteData]       = useState(null)
  const [analyticsData, setAnalyticsData] = useState(null)
  const [selectedSym, setSelectedSym]   = useState('AAPL')
  const [selectedPeriod, setSelectedPeriod] = useState('1y')
  const [marketState, setMarketState]   = useState('REGULAR')
  const [lastUpdate, setLastUpdate]     = useState('--')
  const [searchOpen, setSearchOpen]     = useState(false)
  const [askOpen, setAskOpen]           = useState(false)

  const fetchQuotes = useCallback(async () => {
    try {
      const r = await fetch('/api/quotes')
      const d = await r.json()
      if (d.quotes) {
        setQuoteData(d)
        const anyQ = Object.values(d.quotes)[0]
        setMarketState(anyQ?.state || 'REGULAR')
        setLastUpdate('更新: ' + new Date().toLocaleTimeString('zh-CN'))
      }
    } catch (e) {
      console.error('fetchQuotes:', e)
    }
  }, [])

  const fetchAnalytics = useCallback(async () => {
    try {
      const r = await fetch('/api/analytics')
      const d = await r.json()
      if (d.stocks) setAnalyticsData(d)
    } catch (e) {
      console.error('fetchAnalytics:', e)
    }
  }, [])

  useEffect(() => {
    fetchQuotes()
    fetchAnalytics()
    const q = setInterval(fetchQuotes, 15_000)
    const a = setInterval(fetchAnalytics, 300_000)
    return () => { clearInterval(q); clearInterval(a) }
  }, [fetchQuotes, fetchAnalytics])

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = e => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const quotes = quoteData?.quotes || {}
  const panicScore = analyticsData?.market?.panicScore ?? calculatePanic(quotes)

  return (
    <>
      <Header
        marketState={marketState}
        lastUpdate={lastUpdate}
        onSearchOpen={() => setSearchOpen(true)}
        onAskOpen={() => setAskOpen(true)}
      />

      <main>
        <div className="left-rail">
          <PanicSection
            quotes={quotes}
            analyticsData={analyticsData}
            panicScore={panicScore}
            selectedSym={selectedSym}
            onSelectSym={setSelectedSym}
          />
          <StructureSection analyticsData={analyticsData} />
        </div>

        <div className="center-rail">
          <StockSection
            title="杠杆 ETF" icon="⚡" sub="QQQ · TQQQ · SQQQ"
            id="sec-etf" gridId="etfGrid"
            syms={SYMBOLS.etfs} quotes={quotes}
            selectedSym={selectedSym} onSelectSym={setSelectedSym}
          />
          <StockSection
            title="科技七姐妹 (Mag 7)" icon="🏆" sub=""
            id="sec-mag7" gridId="mag7Grid"
            syms={SYMBOLS.mag7} quotes={quotes}
            selectedSym={selectedSym} onSelectSym={setSelectedSym}
          />
          <StockSection
            title="半导体 / 科技股" icon="🔬" sub=""
            id="sec-tech" gridId="techGrid"
            syms={SYMBOLS.tech} quotes={quotes}
            selectedSym={selectedSym} onSelectSym={setSelectedSym}
          />
          <RiskTable
            analyticsData={analyticsData}
            quoteData={quoteData}
            selectedSym={selectedSym}
            onSelectSym={setSelectedSym}
          />
          <LeverageSection analyticsData={analyticsData} />
        </div>

        <div className="right-rail">
          <ChartSection
            selectedSym={selectedSym}
            selectedPeriod={selectedPeriod}
            onPeriodChange={setSelectedPeriod}
            quoteData={quoteData}
            analyticsData={analyticsData}
          />
          <AiInsight
            quotes={quotes}
            analyticsData={analyticsData}
            panicScore={panicScore}
            onAskOpen={() => setAskOpen(true)}
          />
        </div>
      </main>

      <footer className="site-footer">
        <p>数据来源: Yahoo Finance · 延迟约15秒 · 仅供参考，不构成投资建议</p>
      </footer>

      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectSym={sym => { setSelectedSym(sym); setSearchOpen(false) }}
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
