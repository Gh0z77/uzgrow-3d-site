import Lenis from 'lenis'
import gsap from 'gsap'

/**
 * Butun sayt uchun yagona scroll holati.
 * target  — 3D hikoya progressi (0..1): faqat .scroll-space bo'ylab; undan keyin sahifa oddiy davom etadi
 * current — kamera/animatsiya ishlatadigan, inertsiya bilan yumshatilgan qiymat
 * after   — hikoya tugagandan keyin qancha piksel pastga tushilgan (oddiy bo'limlar uchun)
 */
export const scroll = { target: 0, current: 0, velocity: 0, after: 0 }

let lenis: Lenis | null = null
let storyEnd = 1

function measure() {
  const space = document.querySelector<HTMLElement>('.scroll-space')
  storyEnd = space ? Math.max(1, space.offsetTop + space.offsetHeight - window.innerHeight) : 1
}

export function initScroll() {
  if (lenis) return lenis
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 })
  measure()
  window.addEventListener('resize', measure)
  lenis.on('scroll', (l: Lenis) => {
    scroll.target = Math.min(1, l.scroll / storyEnd)
    scroll.after = Math.max(0, l.scroll - storyEnd)
  })
  gsap.ticker.add((time) => lenis!.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis
  return lenis
}

/**
 * Uzoq sakrashda (menyudan bo'limga) butun 3D hikoya tez o'tib ketmasin: darhol o'tamiz.
 * Bo'lim hali yuklanmagan bo'lsa, paydo bo'lishini kutamiz.
 */
export function scrollTo(target: number | string | HTMLElement, attempt = 0) {
  if (!lenis) return
  let y: number | null = null
  if (typeof target === 'number') y = target
  else {
    const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target
    if (!el) {
      if (attempt < 40) window.setTimeout(() => scrollTo(target, attempt + 1), 100)
      return
    }
    y = el.getBoundingClientRect().top + window.scrollY
  }
  const far = Math.abs(y - window.scrollY) > window.innerHeight * 3
  lenis.scrollTo(y, far ? { immediate: true, offset: -72, force: true } : { duration: 1.4, offset: typeof target === 'number' ? 0 : -72, force: true })
  // Qo'lda sakraganda 3D ham shu joyga darhol kelsin
  if (far) scroll.current = scroll.target
}

/**
 * Til almashganda matn uzunligi va bo'limlar balandligi o'zgaradi: o'quvchi o'sha bo'limning o'sha joyida qolsin.
 * 3D hikoya uzunligi matnga bog'liq emas, u yerda hech narsa qilish shart emas.
 */
export function keepPlace(change: () => void) {
  const line = 80 // tepadagi panel ostidagi chiziq
  const anchor = scroll.after > 0 ? [...document.querySelectorAll<HTMLElement>('.after > *')].find((el) => el.getBoundingClientRect().bottom > line) : undefined
  const before = anchor?.getBoundingClientRect()
  change()
  if (!lenis || !anchor || !before) return
  const after = anchor.getBoundingClientRect()
  lenis.resize()
  lenis.scrollTo(window.scrollY + after.top + ((line - before.top) / before.height) * after.height - line, { immediate: true, force: true })
}

/** Oyna (drawer, lightbox) ochiq paytda orqa fon aylanmasin. */
export function lockScroll(on: boolean) {
  if (on) lenis?.stop()
  else lenis?.start()
  // Oyna tepadagi menyu va tezkor aloqa tugmasi ustida tursin
  document.documentElement.classList.toggle('has-modal', on)
}

/** Kadrga bog'liq bo'lmagan yumshatish (frame-rate independent damping). */
export function damp(a: number, b: number, lambda: number, dt: number) {
  return a + (b - a) * (1 - Math.exp(-lambda * dt))
}

/** p qiymatini [a,b] oralig'ida 0..1 ga aylantiradi. */
export function range(p: number, a: number, b: number) {
  return Math.min(1, Math.max(0, (p - a) / (b - a)))
}

export const smooth = (t: number) => t * t * (3 - 2 * t)
