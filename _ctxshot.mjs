import { spawn } from 'child_process'
import { writeFileSync } from 'fs'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const url = process.argv[2]
const out = process.argv[3]
const sel = process.argv[4] || '.wl-row'
const waitMs = +(process.argv[5] || 7000)
const W = +(process.argv[6] || 1500), H = +(process.argv[7] || 900)
const PORT = 9733 + Math.floor(Math.random() * 400)

const proc = spawn(CHROME, [
  '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
  '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${process.env.TEMP}\\chrome-ctx-${Date.now()}`,
  `--window-size=${W},${H}`, 'about:blank',
], { stdio: 'ignore' })
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function main() {
  let wsUrl
  for (let i = 0; i < 50; i++) {
    try {
      const tr = await fetch(`http://127.0.0.1:${PORT}/json`)
      const page = (await tr.json()).find(t => t.type === 'page')
      if (page?.webSocketDebuggerUrl) { wsUrl = page.webSocketDebuggerUrl; break }
    } catch {}
    await sleep(250)
  }
  if (!wsUrl) { console.log('NO_WS'); proc.kill(); process.exit(1) }
  const ws = new WebSocket(wsUrl)
  let id = 0; const pending = new Map()
  const send = (m, p = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })) })
  await new Promise(res => ws.addEventListener('open', res))
  ws.addEventListener('message', ev => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id) } })
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.navigate', { url })
  await sleep(waitMs)
  // 在目标元素中心派发 contextmenu 事件
  await send('Runtime.evaluate', { expression: `(() => {
    const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return 'NO_EL';
    const r = el.getBoundingClientRect();
    const ev = new MouseEvent('contextmenu', { bubbles: true, cancelable: true,
      clientX: Math.round(r.left + r.width/2), clientY: Math.round(r.top + r.height/2), button: 2 });
    el.dispatchEvent(ev); return 'OK';
  })()` })
  await sleep(700)
  // 取菜单矩形，截图裁剪到菜单附近放大可读
  const rectRes = await send('Runtime.evaluate', {
    expression: `(() => { const m = document.querySelector('.ctx-menu'); if(!m) return ''; const r = m.getBoundingClientRect(); return JSON.stringify({x:r.left,y:r.top,w:r.width,h:r.height}); })()`,
    returnByValue: true,
  })
  let clip = null
  try { const r = JSON.parse(rectRes.result.value); clip = { x: Math.max(0, r.x - 12), y: Math.max(0, r.y - 12), width: r.w + 24, height: r.h + 24, scale: 2 } } catch {}
  const shotParams = { format: 'png', captureBeyondViewport: false }
  if (clip) shotParams.clip = clip
  const { data } = await send('Page.captureScreenshot', shotParams)
  writeFileSync(out, Buffer.from(data, 'base64'))
  console.log('OK ' + Math.round(Buffer.from(data, 'base64').length / 1024) + ' KB')
  ws.close(); proc.kill(); process.exit(0)
}
main().catch(e => { console.log('ERR ' + e.message); proc.kill(); process.exit(1) })
