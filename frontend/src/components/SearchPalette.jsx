import { useState, useEffect, useRef, useCallback } from 'react'
import { SYMBOLS, CN_NAMES, SEARCH_ALIASES, SEARCH_TERMS } from '../lib/constants.js'

function buildIndex() {
  const items = []
  const allSyms = [...SYMBOLS.indices, ...SYMBOLS.etfs, ...SYMBOLS.mag7, ...SYMBOLS.tech]
  for (const sym of allSyms) {
    const cn   = CN_NAMES[sym] || sym
    const code = sym.replace('^', '')
    items.push({
      type: 'stock', sym,
      title: code, sub: cn,
      icon: sym.startsWith('^') ? '📊' : '◆',
      terms: [code, cn, ...(SEARCH_ALIASES[sym] || [])].map(s => s.toLowerCase()),
    })
  }
  for (const t of SEARCH_TERMS) {
    items.push({
      type: 'metric', target: t.target,
      title: t.name, sub: t.sub, icon: '◈',
      terms: [t.name, ...(t.kw || [])].map(s => s.toLowerCase()),
    })
  }
  return items
}

const INDEX = buildIndex()

function Hl({ text, q }) {
  if (!q) return <>{text}</>
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return <>{text}</>
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + q.length)}</mark>{text.slice(i + q.length)}</>
}

function jumpToSection(id) {
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  el.classList.remove('flash-highlight')
  void el.offsetWidth
  el.classList.add('flash-highlight')
  setTimeout(() => el.classList.remove('flash-highlight'), 1500)
}

export default function SearchPalette({ open, onClose, onSelectSym }) {
  const [query, setQuery]   = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  const matches = query.trim()
    ? INDEX.filter(i => i.terms.some(t => t.includes(query.trim().toLowerCase())))
        .sort((a, b) => {
          const q = query.trim().toLowerCase()
          return (a.terms.some(t => t.startsWith(q)) ? 0 : 1) - (b.terms.some(t => t.startsWith(q)) ? 0 : 1)
        })
    : INDEX.filter(i => i.type === 'stock')

  const ordered = [...matches.filter(i => i.type === 'stock'), ...matches.filter(i => i.type === 'metric')]

  const exec = useCallback(idx => {
    const it = ordered[idx]
    if (!it) return
    onClose()
    if (it.type === 'stock') {
      onSelectSym(it.sym)
      setTimeout(() => jumpToSection('sec-chart'), 80)
    } else {
      jumpToSection(it.target)
    }
  }, [ordered, onClose, onSelectSym])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    const onKey = e => {
      if (!open) return
      if (e.key === 'Escape')    { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, ordered.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter')     { e.preventDefault(); exec(active) }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, active, ordered.length, exec, onClose])

  if (!open) return null

  const stocks  = matches.filter(i => i.type === 'stock')
  const metrics = matches.filter(i => i.type === 'metric')
  const q = query.trim().toLowerCase()

  let idx = 0
  const renderItem = it => {
    const i = idx++
    const tagCls = it.type === 'stock' ? 'stock' : 'metric'
    const tagTxt = it.type === 'stock' ? '股票' : '指标'
    return (
      <div
        key={it.sym || it.title}
        className={`search-item${i === active ? ' active' : ''}`}
        onMouseMove={() => setActive(i)}
        onClick={() => exec(i)}
      >
        <span className="si-icon">{it.icon}</span>
        <div className="si-body">
          <div className="si-main"><Hl text={it.title} q={q} /></div>
          <div className="si-sub"><Hl text={it.sub} q={q} /></div>
        </div>
        <span className={`si-tag ${tagCls}`}>{tagTxt}</span>
      </div>
    )
  }

  return (
    <div className="search-overlay open" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="搜索">
        <div className="search-input-wrap">
          <span className="si-prompt">❯</span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="搜索股票代码 / 名称 / 指标术语…"
            autoComplete="off"
            spellCheck="false"
            value={query}
            onChange={e => { setQuery(e.target.value); setActive(0) }}
          />
          <span className="esc-hint">ESC</span>
        </div>
        <div className="search-results">
          {matches.length === 0 ? (
            <div className="search-empty">
              <div className="se-big">⊘</div>
              没有找到 "{query}" 相关的股票或指标
            </div>
          ) : (
            <>
              {stocks.length > 0 && (
                <>
                  <div className="search-group-title">股票 / 指数 · {stocks.length}</div>
                  {stocks.map(renderItem)}
                </>
              )}
              {metrics.length > 0 && (
                <>
                  <div className="search-group-title">指标 / 板块 · {metrics.length}</div>
                  {metrics.map(renderItem)}
                </>
              )}
            </>
          )}
        </div>
        <div className="search-footer">
          <span><kbd>↑↓</kbd>导航</span>
          <span><kbd>↵</kbd>打开</span>
          <span><kbd>esc</kbd>关闭</span>
        </div>
      </div>
    </div>
  )
}
