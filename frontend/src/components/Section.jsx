import { useReveal } from '../lib/hooks.js'

export default function Section({ id, num, eyebrow, title, sub, children }) {
  const ref = useReveal()
  return (
    <section id={id} ref={ref} className="site-section reveal">
      <div className="section-head">
        <div className="section-meta">
          <span className="section-num">{num}</span>
          <span className="section-eyebrow">{eyebrow}</span>
        </div>
        <h2 className="section-h">{title}</h2>
        {sub && <p className="section-desc">{sub}</p>}
      </div>
      <div className="section-body">{children}</div>
    </section>
  )
}
