import { useRef, useEffect, useState } from 'react'
import * as LightweightCharts from 'lightweight-charts'
import { CN_NAMES } from '../lib/constants.js'
import { buildRSISeries, maLine, fmtPrice, fmtVol, fmtMktCap, rangePos } from '../lib/utils.js'

const PERIODS = ['1d', '1w', '1mo', '6mo', '1y', '5y', '20y']
const PERIOD_LABELS = { '1d':'1日', '1w':'1周', '1mo':'1月', '6mo':'6月', '1y':'1年', '5y':'5年', '20y':'20年' }

export default function ChartSection({ selectedSym, selectedPeriod, onPeriodChange, quoteData, analyticsData }) {
  const mainElRef   = useRef(null)
  const rsiElRef    = useRef(null)
  const mainChart   = useRef(null)
  const candleSeries = useRef(null)
  const volumeSeries = useRef(null)
  const maSeries    = useRef({})
  const rsiChart    = useRef(null)
  const rsiSeries   = useRef(null)
  const [loading, setLoading] = useState(false)
  const [rsiLabel, setRsiLabel] = useState('')
  const [chartStats, setChartStats] = useState(null)
  const [chartSym, setChartSym] = useState(selectedSym)

  // Initialize charts once
  useEffect(() => {
    const mainEl = mainElRef.current
    const rsiEl  = rsiElRef.current
    if (!mainEl || !rsiEl) return

    const mc = LightweightCharts.createChart(mainEl, {
      layout:  { background: { color: '#0d1b28' }, textColor: '#8ea4b8' },
      grid:    { vertLines: { color: '#1b3348' }, horzLines: { color: '#1b3348' } },
      crosshair: {
        mode: LightweightCharts.CrosshairMode.Normal,
        vertLine: { color: '#f5c84b88', labelBackgroundColor: '#f5c84b' },
        horzLine: { color: '#f5c84b88', labelBackgroundColor: '#f5c84b' },
      },
      rightPriceScale: { borderColor: '#234156' },
      timeScale: { borderColor: '#234156', timeVisible: true, secondsVisible: false },
      handleScroll: true,
      handleScale:  true,
    })

    const cs = mc.addCandlestickSeries({
      upColor: '#3fd37f', downColor: '#ff4d5a',
      borderUpColor: '#3fd37f', borderDownColor: '#ff4d5a',
      wickUpColor: '#3fd37f', wickDownColor: '#ff4d5a',
    })

    maSeries.current.ma20  = mc.addLineSeries({ color: '#4aa3ff', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    maSeries.current.ma50  = mc.addLineSeries({ color: '#f5c84b', lineWidth: 1,   priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    maSeries.current.ma200 = mc.addLineSeries({ color: '#ff6b6b', lineWidth: 1.5, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    const vs = mc.addHistogramSeries({
      color: '#cc785c2e',
      priceFormat: { type: 'volume' },
      priceScaleId: 'vol',
    })
    mc.priceScale('vol').applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } })

    const rc = LightweightCharts.createChart(rsiEl, {
      layout:  { background: { color: '#0d1b28' }, textColor: '#8ea4b8' },
      grid:    { vertLines: { color: '#1b3348' }, horzLines: { color: '#1b3348' } },
      crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
      rightPriceScale: { borderColor: '#234156', visible: true },
      timeScale: { borderColor: '#234156', visible: false },
      handleScroll: false, handleScale: false,
    })

    const rs = rc.addLineSeries({ color: '#a78bfa', lineWidth: 1.5, priceLineVisible: false })
    rc.addLineSeries({ color: '#ff4d5a44', lineWidth: 1, lineStyle: 2, priceLineVisible: false }).setData([])
    rc.addLineSeries({ color: '#3fd37f44', lineWidth: 1, lineStyle: 2, priceLineVisible: false }).setData([])

    mc.timeScale().subscribeVisibleTimeRangeChange(range => {
      if (range?.from != null && range?.to != null) {
        try { rc.timeScale().setVisibleRange(range) } catch {}
      }
    })

    const ro = new ResizeObserver(() => {
      mc.resize(mainEl.clientWidth, mainEl.clientHeight)
      rc.resize(rsiEl.clientWidth, rsiEl.clientHeight)
    })
    ro.observe(mainEl)
    ro.observe(rsiEl)

    mainChart.current   = mc
    candleSeries.current = cs
    volumeSeries.current = vs
    rsiChart.current    = rc
    rsiSeries.current   = rs

    return () => { mc.remove(); rc.remove(); ro.disconnect() }
  }, [])

  // Load chart data when sym/period changes
  useEffect(() => {
    if (!candleSeries.current) return

    const load = async () => {
      setLoading(true)
      setChartSym(selectedSym)
      try {
        const r = await fetch(`/api/history/${encodeURIComponent(selectedSym)}?period=${selectedPeriod}`)
        const data = await r.json()
        if (!data.candles?.length) throw new Error('无数据')

        const candles = data.candles
        candleSeries.current.setData(candles)
        volumeSeries.current.setData(candles.map(c => ({
          time: c.time, value: c.volume,
          color: c.close >= c.open ? '#3fd37f44' : '#ff4d5a44',
        })))

        const rsiData = buildRSISeries(candles)
        rsiSeries.current.setData(rsiData)

        const lastRsi = rsiData.at(-1)?.value
        if (lastRsi != null) {
          setRsiLabel(`RSI ${lastRsi.toFixed(1)}`)
        } else {
          setRsiLabel('')
        }

        const showMA = ['1mo', '6mo', '1y', '5y', '20y'].includes(selectedPeriod)
        maSeries.current.ma20.setData(showMA && candles.length > 20  ? maLine(candles, 20)  : [])
        maSeries.current.ma50.setData(showMA && candles.length > 50  ? maLine(candles, 50)  : [])
        maSeries.current.ma200.setData(showMA && candles.length > 200 ? maLine(candles, 200) : [])

        mainChart.current.timeScale().fitContent()
        rsiChart.current.timeScale().fitContent()
      } catch (e) {
        console.error('Chart load error:', e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedSym, selectedPeriod])

  // Update chart stats when quote/analytics data changes
  useEffect(() => {
    const q = quoteData?.quotes?.[selectedSym]
    const a = analyticsData?.stocks?.[selectedSym]
    if (!q) return

    const cur  = (quoteData?.quotes?.[selectedSym]?.currency || 'USD') === 'USD' ? '$' : ''
    const rPos = rangePos(q.price, q.low52, q.high52)
    const volR = q.avgVol > 0 ? (q.volume / q.avgVol).toFixed(2) : '--'
    const sgn  = v => (v >= 0 ? '+' : '') + v

    setChartStats({ q, a, cur, rPos, volR, sgn })
  }, [selectedSym, quoteData, analyticsData])

  const rsiClass = rsiLabel
    ? parseFloat(rsiLabel.replace('RSI ', '')) < 30 ? 'negative'
    : parseFloat(rsiLabel.replace('RSI ', '')) > 70 ? 'positive' : 'neutral'
    : ''

  return (
    <section className="chart-section" id="sec-chart">
      <div className="chart-header">
        <div className="chart-title-wrap">
          <span className="chart-symbol">{chartSym.replace('^', '')}</span>
          <span className="chart-name">{quoteData?.quotes?.[chartSym]?.name || CN_NAMES[chartSym] || chartSym}</span>
          {rsiLabel && <span className={`chart-rsi ${rsiClass}`}>{rsiLabel}</span>}
        </div>
        <div className="period-buttons">
          {PERIODS.map(p => (
            <button
              key={p}
              className={`period-btn${selectedPeriod === p ? ' active' : ''}`}
              onClick={() => onPeriodChange(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div ref={mainElRef} className="chart-container">
        {loading && (
          <div className="chart-loading">
            <div className="spinner" />
            <span>载入图表中…</span>
          </div>
        )}
      </div>

      <div className="rsi-label-row">
        <span>RSI (14)</span>
        <div ref={rsiElRef} className="rsi-container" />
      </div>

      {chartStats && (
        <div className="chart-stats">
          <div className="stat-item"><span className="s-label">开盘</span><span className="s-val">{fmtPrice(chartStats.q.open, chartStats.cur)}</span></div>
          <div className="stat-item"><span className="s-label">日高</span><span className="s-val">{fmtPrice(chartStats.q.dayHigh, chartStats.cur)}</span></div>
          <div className="stat-item"><span className="s-label">日低</span><span className="s-val">{fmtPrice(chartStats.q.dayLow, chartStats.cur)}</span></div>
          <div className="stat-item"><span className="s-label">昨收</span><span className="s-val">{fmtPrice(chartStats.q.prevClose, chartStats.cur)}</span></div>
          <div className="stat-item"><span className="s-label">成交量</span><span className="s-val">{fmtVol(chartStats.q.volume)}</span></div>
          <div className="stat-item"><span className="s-label">均量比</span><span className="s-val">{chartStats.volR}x</span></div>
          <div className="stat-item"><span className="s-label">市值</span><span className="s-val">{fmtMktCap(chartStats.q.mktCap)}</span></div>
          <div className="stat-item"><span className="s-label">52W位置</span><span className="s-val">{chartStats.rPos}%</span></div>
          {chartStats.a && <>
            <div className="stat-item"><span className="s-label">HV20</span><span className="s-val">{chartStats.a.hv20}%</span></div>
            <div className="stat-item"><span className="s-label">Beta</span><span className={`s-val ${chartStats.a.beta > 1.2 ? 'negative' : chartStats.a.beta < 0 ? 'positive' : ''}`}>{chartStats.a.beta ?? '--'}</span></div>
            <div className="stat-item"><span className="s-label">当前回撤</span><span className="s-val negative">{chartStats.a.curDD}%</span></div>
            <div className="stat-item"><span className="s-label">最大回撤</span><span className="s-val negative">{chartStats.a.maxDD}%</span></div>
            <div className="stat-item"><span className="s-label">VaR95</span><span className="s-val negative">{chartStats.a.var95}%</span></div>
            <div className="stat-item"><span className="s-label">距MA200</span><span className={`s-val ${chartStats.a.priceVs200 >= 0 ? 'positive' : 'negative'}`}>{chartStats.sgn(chartStats.a.priceVs200)}%</span></div>
            <div className="stat-item"><span className="s-label">ATR</span><span className="s-val">{chartStats.a.atrPct ?? '--'}%</span></div>
            {chartStats.a.macd && <div className="stat-item"><span className="s-label">MACD柱</span><span className={`s-val ${chartStats.a.macd.hist >= 0 ? 'positive' : 'negative'}`}>{chartStats.a.macd.hist}</span></div>}
          </>}
        </div>
      )}
    </section>
  )
}
