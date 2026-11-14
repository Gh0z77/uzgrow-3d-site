/**
 * Grafika sifati darajasi. Boshlang'ichi qurilmaga qarab tanlanadi; PerformanceMonitor FPS pasayganini
 * sezsa, bir pog'ona tushiradi (Experience.tsx). Sifat scroll paytida sakramasligi uchun faqat pastga tushadi.
 */
export type Tier = 'high' | 'medium' | 'low'

const nav = navigator as Navigator & { deviceMemory?: number }
const isPhone = window.matchMedia('(max-width: 760px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent)
const weak = (nav.deviceMemory ?? 8) <= 4 || (navigator.hardwareConcurrency ?? 8) <= 4

/** Noutbukda brauzer ko'pincha diskret karta emas, ichki (Intel/AMD APU) grafikada ishlaydi — u 3–5 baravar sekin. */
function gpuName() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    if (!gl) return ''
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    const name = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER))
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return name
  } catch {
    return ''
  }
}
const gpu = gpuName()
const software = /SwiftShader|llvmpipe|Microsoft Basic/i.test(gpu)
const integrated = /Intel|UHD|Iris|Radeon\(TM\) Graphics|Radeon Graphics|Vega \d+ Graphics/i.test(gpu)

// ?q=low|medium|high — sifatni qo'lda tanlash (sinov va juda kuchsiz qurilmalar uchun)
const forced = new URLSearchParams(location.search).get('q')

export const quality = {
  tier: (forced === 'low' || forced === 'medium' || forced === 'high' ? forced : isPhone || software ? 'low' : weak || integrated ? 'medium' : 'high') as Tier,
  isPhone,
}

/**
 * Kadr narxi piksel soniga deyarli to'g'ri proporsional (RTX 3050: 0.8 Mpx — 10 ms, 3.3 Mpx — 18 ms).
 * Shuning uchun DPR ekran o'lchamidan hisoblanadi: chiziladigan piksel soni pog'ona byudjetidan oshmaydi.
 * shortcut: oyna o'lchami faqat yuklanganda hisobga olinadi, keyin kattalashtirilsa byudjet qayta hisoblanmaydi.
 */
function dpr(maxDpr: number, budget: number): [number, number] {
  const fit = Math.sqrt(budget / (window.innerWidth * window.innerHeight))
  const hi = Math.max(0.75, Math.min(maxDpr, fit))
  return [Math.min(1, hi), hi]
}

export const SETTINGS: Record<Tier, { dpr: [number, number]; msaa: number; ao: boolean; noise: boolean; shadow: number }> = {
  high: { dpr: dpr(1.5, 1.8e6), msaa: 2, ao: true, noise: true, shadow: 2048 },
  medium: { dpr: dpr(1.25, 1.2e6), msaa: 2, ao: true, noise: false, shadow: 1536 },
  // telefonning plitkali GPU'sida MSAA deyarli tekin, kuchsiz kompyuterda esa qimmat
  low: { dpr: dpr(1.25, 0.7e6), msaa: isPhone ? 2 : 0, ao: false, noise: false, shadow: 1024 },
}

export const NEXT_TIER: Record<Tier, Tier> = { high: 'medium', medium: 'low', low: 'low' }
