import { useEffect, useState } from 'react'

const KW_CN = {
  tariff:'关税', trade:'贸易', china:'中国', fed:'美联储', rate:'利率',
  interest:'利率', market:'市场', stock:'股票', economy:'经济',
  inflation:'通胀', bank:'银行', dollar:'美元', oil:'石油', gold:'黄金',
  sanction:'制裁', deal:'协议', import:'进口', export:'出口', tax:'税收',
  'wall street':'华尔街', nasdaq:'纳指', 's&p':'标普', recession:'衰退',
  cut:'降息/减税', hike:'加息/关税', crypto:'加密', bitcoin:'比特币',
}

function relTime(ts) {
  if (!ts) return ''
  const d = Math.floor(Date.now() / 1000 - ts)
  if (d < 60)   return '刚刚'
  if (d < 3600) return `${Math.floor(d / 60)} 分钟前`
  if (d < 86400)return `${Math.floor(d / 3600)} 小时前`
  return `${Math.floor(d / 86400)} 天前`
}

export default function TrumpFeed() {
  const [data, setData]       = useState(null)
  const [filter, setFilter]   = useState('market')
  const [expanded, setExpanded] = useState({})
  const [error, setError]     = useState(null)

  const load = async () => {
    try {
      const r = await fetch('/api/trump')
      const d = await r.json()
      if (d.posts) { setData(d); setError(null) }
      else if (d.error) setError(d.error)
    } catch (e) { setError(e.message) }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 180_000)
    return () => clearInterval(t)
  }, [])

  const posts = data?.posts || []
  const marketPosts = posts.filter(p => p.isMarketSensitive)
  const shown = filter === 'market' ? marketPosts : posts

  return (
    <div className="trump-wrap">
      {/* 头部 */}
      <div className="trump-header">
        <div className="trump-header-left">
          <div className="trump-avatar">T</div>
          <div>
            <div className="trump-name">Donald J. Trump</div>
            <div className="trump-platform">Truth Social · 实时</div>
          </div>
        </div>
        <div className="trump-tabs">
          <button className={`trump-tab${filter === 'market' ? ' active' : ''}`} onClick={() => setFilter('market')}>
            市场相关
            {marketPosts.length > 0 && <span className="trump-badge">{marketPosts.length}</span>}
          </button>
          <button className={`trump-tab${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')}>
            全部
          </button>
        </div>
      </div>

      <div className="trump-disclaimer">
        ⚡ 特朗普言论曾直接引发标普 9.52% 单日涨幅（2025-04-09 暂停关税贴文）。以下内容仅供信息参考。
      </div>

      {/* 状态 */}
      {!data && !error && <div className="trump-status">连接 Truth Social…</div>}
      {error && <div className="trump-status trump-error">无法连接 Truth Social：{error}</div>}
      {data && shown.length === 0 && (
        <div className="trump-status">
          {filter === 'market' ? '近期没有检测到市场相关帖子。' : '暂无动态数据。'}
        </div>
      )}

      {/* 帖子列表 */}
      <div className="trump-feed">
        {shown.map((p, i) => {
          const isExp = expanded[i]
          const preview = p.content.length > 220 ? p.content.slice(0, 220) + '…' : p.content
          return (
            <div key={i} className={`trump-post${p.isMarketSensitive ? ' trump-hot' : ''}`}>
              <div className="trump-post-meta">
                <span className="trump-time">{relTime(p.ts)}</span>
                {p.isMarketSensitive && (
                  <span className="trump-kw-badges">
                    {p.keywords.map(k => (
                      <span key={k} className="trump-kw">{KW_CN[k] || k}</span>
                    ))}
                  </span>
                )}
              </div>
              <p className="trump-body">{isExp ? p.content : preview}</p>
              <div className="trump-post-foot">
                {p.content.length > 220 && (
                  <button className="trump-expand" onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}>
                    {isExp ? '收起' : '展开全文'}
                  </button>
                )}
                {p.link && (
                  <a className="trump-link" href={p.link} target="_blank" rel="noopener noreferrer">
                    Truth Social 原帖 ↗
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="trump-note">数据源 trumpstruth.org · 每 3 分钟更新 · 不代表本站立场</div>
    </div>
  )
}
