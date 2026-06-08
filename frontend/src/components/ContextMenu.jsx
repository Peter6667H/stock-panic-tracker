import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export default function ContextMenu({ x, y, title, items, onClose }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x, y })

  // 贴边翻转：菜单不超出视口
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth, h = el.offsetHeight
    let nx = x, ny = y
    if (x + w > window.innerWidth - 8) nx = Math.max(8, window.innerWidth - w - 8)
    if (y + h > window.innerHeight - 8) ny = Math.max(8, window.innerHeight - h - 8)
    setPos({ x: nx, y: ny })
  }, [x, y])

  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    const close = () => onClose()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    document.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  return (
    <div
      className="ctx-overlay"
      onMouseDown={onClose}
      onContextMenu={e => { e.preventDefault(); onClose() }}
    >
      <div
        ref={ref}
        className="ctx-menu"
        style={{ left: pos.x, top: pos.y }}
        onMouseDown={e => e.stopPropagation()}
        onContextMenu={e => e.preventDefault()}
      >
        {title && <div className="ctx-title">{title}</div>}
        {items.map((it, i) =>
          it.sep ? (
            <div key={i} className="ctx-sep" />
          ) : (
            <button
              key={i}
              className={`ctx-item${it.danger ? ' danger' : ''}`}
              disabled={it.disabled}
              onClick={() => { if (!it.disabled) { it.onClick(); onClose() } }}
            >
              <span className="ctx-icon">{it.icon}</span>
              <span className="ctx-label">{it.label}</span>
              {it.hint && <span className="ctx-kbd">{it.hint}</span>}
            </button>
          )
        )}
      </div>
    </div>
  )
}
