import { useState, useRef, useEffect } from 'react'

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * 数字滚动动画：目标值变化时，从当前值平滑滚动到目标值。
 * 用于恐慌主分数等关键数字，制造 HUD"读数跳动"感。
 */
export function useCountUp(target, duration = 650) {
  const [val, setVal] = useState(target ?? 0)
  const fromRef = useRef(target ?? 0)
  const rafRef = useRef(0)

  useEffect(() => {
    if (target == null) return
    if (prefersReduced()) { setVal(target); fromRef.current = target; return }

    const from = fromRef.current
    if (from === target) return
    const start = performance.now()
    cancelAnimationFrame(rafRef.current)

    const tick = now => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)          // easeOutCubic
      setVal(Math.round(from + (target - from) * eased))
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, duration])

  return target == null ? null : val
}

/**
 * 值变更时返回一个递增的 key，配合 CSS .hud-flash 触发背景闪烁。
 * 用法：const flashKey = useFlashOnChange(price)
 *       <span key={flashKey} className="hud-flash">...</span>
 */
export function useFlashOnChange(value) {
  const [key, setKey] = useState(0)
  const prev = useRef(value)
  const first = useRef(true)

  useEffect(() => {
    if (first.current) { first.current = false; prev.current = value; return }
    if (value !== prev.current && value != null) {
      prev.current = value
      if (!prefersReduced()) setKey(k => k + 1)
    }
  }, [value])

  return key
}
