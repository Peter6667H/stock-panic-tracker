import { useState, useEffect } from 'react'
import { CN_NAMES } from '../lib/constants.js'
import { HOLDABLE, getHoldings, setHoldings } from '../lib/portfolio.js'
import { fmtPrice } from '../lib/utils.js'

export default function PortfolioModal({ open, onClose, onSaved, quotes }) {
  const [rows, setRows] = useState([])
  const [sym, setSym] = useState('NVDA')
  const [shares, setShares] = useState('')
  const [cost, setCost] = useState('')

  useEffect(() => { if (open) setRows(getHoldings()) }, [open])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape' && open) onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const add = () => {
    const n = parseFloat(shares)
    if (!sym || !(n > 0)) return
    const next = rows.filter(r => r.sym !== sym)
    next.push({ sym, shares: n, cost: cost ? parseFloat(cost) : undefined })
    setRows(next)
    setShares(''); setCost('')
  }
  const remove = s => setRows(rows.filter(r => r.sym !== s))
  const save = () => { setHoldings(rows); onSaved(rows); onClose() }

  const total = rows.reduce((s, r) => s + (quotes?.[r.sym]?.price ?? r.cost ?? 0) * r.shares, 0)

  return (
    <div className="pf-overlay" onClick={e => { if (e.target.classList.contains('pf-overlay')) onClose() }}>
      <div className="pf-modal" role="dialog" aria-modal="true" aria-label="录入持仓">
        <div className="pf-head">
          <div>
            <div className="pf-title">录入你的持仓</div>
            <div className="pf-sub">数据只存在你本机浏览器，不上传服务器</div>
          </div>
          <button className="pf-close" onClick={onClose} aria-label="关闭">×</button>
        </div>

        <div className="pf-form">
          <select className="pf-input pf-select" value={sym} onChange={e => setSym(e.target.value)}>
            {HOLDABLE.map(s => (
              <option key={s} value={s}>{s.replace('^', '')} · {CN_NAMES[s] || s}</option>
            ))}
          </select>
          <input className="pf-input" type="number" min="0" step="any" placeholder="股数"
            value={shares} onChange={e => setShares(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }} />
          <input className="pf-input" type="number" min="0" step="any" placeholder="成本价(可选)"
            value={cost} onChange={e => setCost(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') add() }} />
        </div>
        <button className="pf-add" onClick={add}>+ 添加到持仓</button>

        <div className="pf-list">
          {rows.length === 0 && <div className="pf-empty">还没有持仓。上面选股票、填股数，点「添加」。</div>}
          {rows.map(r => {
            const q = quotes?.[r.sym]
            const val = (q?.price ?? r.cost ?? 0) * r.shares
            return (
              <div key={r.sym} className="pf-row">
                <span className="pf-row-sym">{r.sym.replace('^', '')}</span>
                <span className="pf-row-name">{CN_NAMES[r.sym] || r.sym}</span>
                <span className="pf-row-shares">{r.shares} 股</span>
                <span className="pf-row-val">{fmtPrice(val)}</span>
                <button className="pf-row-del" onClick={() => remove(r.sym)} aria-label="删除">×</button>
              </div>
            )
          })}
        </div>

        <div className="pf-foot">
          <span className="pf-total">组合市值 <strong>{fmtPrice(total)}</strong> · {rows.length} 只</span>
          <div className="pf-actions">
            <button className="pf-btn ghost" onClick={onClose}>取消</button>
            <button className="pf-btn primary" onClick={save} disabled={rows.length === 0}>保存并计算</button>
          </div>
        </div>
        <div className="pf-disc">仅供参考，不构成投资建议。</div>
      </div>
    </div>
  )
}
