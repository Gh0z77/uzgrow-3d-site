import { damp } from '../scroll'

/**
 * Ob-havo holati. UI (WeatherControl) faqat `kind` ni tanlaydi; qiymatlar sekin o'zgaradi —
 * bulut tez yig'iladi, yer esa asta-sekin ho'llanadi yoki qor bilan qoplanadi.
 * Holat scroll'ga bog'liq emas: tanlangan ob-havo butun hikoya davomida saqlanadi.
 */
export type WeatherKind = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog'

export const WEATHER_OPTIONS: WeatherKind[] = ['clear', 'cloudy', 'rain', 'snow', 'fog']

const TARGETS: Record<WeatherKind, { cloud: number; rain: number; snow: number; fog: number; wet: number; cover: number }> = {
  clear: { cloud: 0, rain: 0, snow: 0, fog: 0, wet: 0, cover: 0 },
  cloudy: { cloud: 0.94, rain: 0, snow: 0, fog: 0.05, wet: 0, cover: 0 },
  rain: { cloud: 1, rain: 1, snow: 0, fog: 0.22, wet: 1, cover: 0 },
  snow: { cloud: 1, rain: 0, snow: 1, fog: 0.05, wet: 0, cover: 1 },
  fog: { cloud: 1, rain: 0, snow: 0, fog: 1, wet: 0.25, cover: 0 },
}

export const weather = { kind: 'clear' as WeatherKind, cloud: 0, rain: 0, snow: 0, fog: 0, wet: 0, cover: 0 }

/** Teksturali materiallar va yer shaderlari uchun umumiy uniformlar. */
export const weatherUniforms = {
  uWet: { value: 0 },
  uSnowCover: { value: 0 },
  uRainTime: { value: 0 },
}

const listeners = new Set<(k: WeatherKind) => void>()
const STORE_KEY = 'uzgrow-weather'

export function setWeather(kind: WeatherKind) {
  if (weather.kind === kind) return
  weather.kind = kind
  try {
    localStorage.setItem(STORE_KEY, kind)
  } catch {
    /* maxfiy oynada saqlanmaydi — muhim emas */
  }
  listeners.forEach((l) => l(kind))
}

export function restoreWeather() {
  try {
    const saved = localStorage.getItem(STORE_KEY) as WeatherKind | null
    if (saved && saved in TARGETS) setWeather(saved)
  } catch {
    /* localStorage yopiq bo'lishi mumkin */
  }
}

export function subscribeWeather(fn: (k: WeatherKind) => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export function updateWeather(dt: number, time: number) {
  const t = TARGETS[weather.kind]
  const d = Math.min(dt, 0.1)
  weather.cloud = damp(weather.cloud, t.cloud, 1.1, d)
  weather.fog = damp(weather.fog, t.fog, 0.9, d)
  weather.rain = damp(weather.rain, t.rain, 1.6, d)
  weather.snow = damp(weather.snow, t.snow, 1.2, d)
  weather.wet = damp(weather.wet, t.wet, t.wet > weather.wet ? 0.55 : 0.3, d)
  weather.cover = damp(weather.cover, t.cover, t.cover > weather.cover ? 0.32 : 0.45, d)
  weatherUniforms.uWet.value = weather.wet
  weatherUniforms.uSnowCover.value = weather.cover
  weatherUniforms.uRainTime.value = time
}

/** Open-Meteo WMO kodi → sayt ob-havosi. */
export function fromWmoCode(code: number): WeatherKind {
  if (code === 45 || code === 48) return 'fog'
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain'
  if (code === 3 || code === 2) return 'cloudy'
  return 'clear'
}
