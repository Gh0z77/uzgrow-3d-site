import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { loadState } from '../loadState'

// Sekin internetda ham sayt ochilsin: model yuklanishda davom etadi, lekin matn va bo'limlar kutib qolmaydi
const MAX_WAIT_MS = 20000

/** Logotip yuklanish foiziga qarab "chiziladi", so'ng parda ochiladi. */
export function Preloader() {
  const [state, setState] = useState({ progress: 0, active: true, failed: false, timedOut: false })
  const [gone, setGone] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const shown = useRef({ v: 0 })
  const [pct, setPct] = useState(0)

  useEffect(() => loadState.subscribe((progress, active, failed) => setState((s) => ({ ...s, progress, active, failed }))), [])
  useEffect(() => {
    const id = window.setTimeout(() => setState((s) => ({ ...s, timedOut: true })), MAX_WAIT_MS)
    return () => window.clearTimeout(id)
  }, [])

  useEffect(() => {
    gsap.to(shown.current, {
      v: state.progress,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: () => setPct(shown.current.v),
    })
  }, [state.progress])

  const ready = (!state.active && state.progress >= 100) || state.failed || state.timedOut
  useEffect(() => {
    if (!ready || !root.current) return
    const tl = gsap.timeline({ delay: 0.4, onComplete: () => setGone(true) })
    tl.to(root.current.querySelector('.loader__inner'), { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' })
    tl.to(root.current, { opacity: 0, duration: 1, ease: 'power2.inOut' }, '-=0.1')
    return () => {
      tl.kill()
    }
  }, [ready])

  if (gone) return null
  return (
    <div className="loader" ref={root}>
      <div className="loader__inner">
        <div className="loader__logo">
          <img src="/images/logo.png" alt="" className="loader__ghost" width={240} height={99} />
          <img src="/images/logo.png" alt="UZ GROW" width={240} height={99} style={{ clipPath: `inset(0 ${100 - pct}% 0 0)` }} />
        </div>
        <p className="loader__pct">{Math.round(pct)}%</p>
      </div>
    </div>
  )
}
