import { useState } from 'react'
import { CN_NAMES } from '../lib/constants.js'
import { fmtPrice } from '../lib/utils.js'

export default function RiskTable({ analyticsData, quoteData, selectedSym, onSelectSym }) {
  const [sort, setSort] = useState({ key: 'beta', dir: 'desc' })

  if (!analyticsData?.stocks) return (
    <section className="stock-section" id="sec-risk">
      <h2 className="section-title"><span className="section-icon">📊</span> 风险指标矩阵 <span className="section-sub">载入中…</span></h2>
    </section>
  )

  const quotes = quoteData?.quotes || {}
  const rows = Object.keys(analyticsData.stocks).map(sym => {
    const q = quotes[sym] || {}
    return { sym, name: CN_NAMES[sym] || q.name || sym, price: q.price ?? 0, pct: q.pct ?? 0, ...analyticsData.stocks[sym] }
  })

  const { key, dir } = sort
  rows.sort((x, y) => {
    let xv = key === 'symbol' ? x.sym : x[key]
    let yv = key === 'symbol' ? y.sym : y[key]
    if (typeof xv === 'string') return dir === 'asc' ? xv.localeCompare(yv) : yv.localeCompare(xv)
    xv = xv ?? -Infinity; yv = yv ?? -Infinity
    return dir === 'asc' ? xv - yv : yv - xv
  })

  const handleSort = col => {
    setSort(prev => ({
      key: col,
      dir: prev.key === col ? (prev.dir === 'asc' ? 'desc' : 'asc') : (col === 'symbol' ? 'asc' : 'desc'),
    }))
  }

  const sgn = v => v == null ? '--' : (v >= 0 ? '+' : '') + v

  const Th = ({ col, children, title }) => (
    <th
      data-sort={col}
      title={title}
      className={sort.key === col ? (sort.dir === 'asc' ? 'sorted-asc' : 'sorted-desc') : ''}
      onClick={() => handleSort(col)}
    >{children}</th>
  )

  return (
    <section className="stock-section" id="sec-risk">
      <h2 className="section-title">
        <span className="section-icon">📊</span> 风险指标矩阵
        <span className="section-sub">点击行查看图表 · 点列头排序</span>
      </h2>
      <div className="risk-table-wrap">
        <table className="risk-table">
          <thead>
            <tr>
              <Th col="symbol">代码</Th>
              <Th col="price">现价</Th>
              <Th col="pct">涨跌%</Th>
              <Th col="hv20" title="20日年化历史波动率">HV20</Th>
              <Th col="beta" title="对标普500的贝塔系数,>1放大市场波动">Beta</Th>
              <Th col="curDD" title="距52周高点回撤">当前回撤</Th>
              <Th col="maxDD" title="一年内最大回撤">最大回撤</Th>
              <Th col="var95" title="95%置信度下单日在险价值">VaR95</Th>
              <Th col="priceVs200" title="价格相对200日均线偏离">距MA200</Th>
              <Th col="atrPct" title="ATR占现价百分比">ATR%</Th>
              <Th col="streak" title="连续涨跌天数">连涨跌</Th>
              <th>趋势信号</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              let sig = <span className="muted">--</span>
              if (r.priceVs200 != null && r.priceVs200 < 0) sig = <span className="sig-tag sig-below">跌破MA200</span>
              else if (r.cross === 'golden') sig = <span className="sig-tag sig-golden">金叉</span>
              else if (r.cross === 'death')  sig = <span className="sig-tag sig-death">死叉</span>
              const streakTxt = r.streak === 0 ? '0' : r.streak > 0 ? `连涨${r.streak}` : `连跌${-r.streak}`
              return (
                <tr
                  key={r.sym}
                  className={r.sym === selectedSym ? 'selected' : ''}
                  onClick={() => onSelectSym(r.sym)}
                >
                  <td>{r.sym.replace('^', '')}<span className="risk-row-name">{r.name}</span></td>
                  <td>{fmtPrice(r.price)}</td>
                  <td className={r.pct >= 0 ? 'positive' : 'negative'}>{r.pct >= 0 ? '+' : ''}{r.pct.toFixed(2)}%</td>
                  <td>{r.hv20}%</td>
                  <td className={r.beta > 1.2 ? 'negative' : r.beta < 0 ? 'positive' : ''}>{r.beta ?? '--'}</td>
                  <td className="negative">{r.curDD}%</td>
                  <td className="negative">{r.maxDD}%</td>
                  <td className="negative">{r.var95}%</td>
                  <td className={r.priceVs200 >= 0 ? 'positive' : 'negative'}>{sgn(r.priceVs200)}%</td>
                  <td>{r.atrPct ?? '--'}%</td>
                  <td className={r.streak >= 0 ? 'positive' : 'negative'}>{streakTxt}</td>
                  <td>{sig}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
