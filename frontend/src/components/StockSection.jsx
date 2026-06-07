import StockCard from './StockCard.jsx'

export default function StockSection({ title, icon, sub, id, syms, quotes, selectedSym, onSelectSym }) {
  return (
    <section className="stock-section" id={id}>
      <h2 className="section-title">
        <span className="section-icon">{icon}</span> {title}
        {sub && <span className="section-sub">{sub}</span>}
      </h2>
      <div className="stock-grid">
        {syms.map(sym => (
          <StockCard
            key={sym}
            sym={sym}
            q={quotes[sym]}
            selected={selectedSym === sym}
            onSelect={onSelectSym}
          />
        ))}
      </div>
    </section>
  )
}
