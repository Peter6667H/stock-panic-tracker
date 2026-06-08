import { useState, useEffect } from 'react'

const LINKS = [
  { id: 'mypanic',  label: '组合体检' },
  { id: 'overview', label: '市场' },
  { id: 'leaders',  label: '龙头股' },
  { id: 'macro',    label: '宏观' },
  { id: 'risk',     label: '风险' },
  { id: 'chart',    label: '图表' },
  { id: 'ai',       label: 'AI' },
]

export default function SiteNav({ marketState, onSearchOpen, onAskOpen }) {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('hero')
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setProgress(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // 滚动间谍：高亮当前所在区
  useEffect(() => {
    const ids = ['hero', ...LINKS.map(l => l.id)]
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    ids.forEach(id => { const el = document.getElementById(id); if (el) io.observe(el) })
    return () => io.disconnect()
  }, [])

  const go = id => e => {
    e.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const live = marketState && marketState !== 'CLOSED'

  return (
    <nav className={`site-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="nav-inner">
        <a href="#hero" className="nav-brand" onClick={go('hero')}>
          <span className="nav-logo">◮</span>
          <span className="nav-wordmark">PANIC<span className="nav-wordmark-dim">·INDEX</span></span>
          <span className={`nav-live${live ? '' : ' off'}`}>{live ? 'LIVE' : 'CLOSED'}</span>
        </a>

        <div className="nav-links">
          {LINKS.map(l => (
            <a key={l.id} href={`#${l.id}`} onClick={go(l.id)}
               className={`nav-link${active === l.id ? ' active' : ''}`}>
              {l.label}
            </a>
          ))}
        </div>

        <div className="nav-actions">
          <button className="nav-icon-btn" onClick={onSearchOpen} aria-label="搜索">
            <span>⌕</span><kbd>⌘K</kbd>
          </button>
          <button className="nav-cta" onClick={onAskOpen}>
            <span className="nav-cta-spark">✦</span> 问 AI
          </button>
        </div>
      </div>
      <div className="nav-progress" style={{ width: `${progress}%` }} />
    </nav>
  )
}
