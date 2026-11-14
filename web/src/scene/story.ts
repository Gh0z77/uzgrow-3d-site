import { scroll, range, smooth } from '../scroll'

/**
 * Scroll'ning qaysi qismi qaysi bobga tegishli (global 0..1).
 * Har bir 3D bob Blender timeline'ida 600 kadr (30 fps) egallaydi.
 */
export const CHAPTERS = [
  { id: 1, from: 0.0, to: 0.2 },
  { id: 2, from: 0.2, to: 0.41 },
  { id: 3, from: 0.41, to: 0.62 },
  { id: 4, from: 0.62, to: 0.82 },
  { id: 5, from: 0.82, to: 1.0 },
] as const

/** Blender timeline'iga ega boblar soni (site.glb ichida). */
export const ANIMATED_CHAPTERS = 5
export const FRAMES_PER_CHAPTER = 600
export const FPS = 30

export function chapterProgress(id: number, s = scroll.current) {
  const c = CHAPTERS[id - 1]
  return c.to > c.from ? range(s, c.from, c.to) : 0
}

/** Bob ichidagi lokal progressni global scroll qiymatiga aylantiradi. */
export function at(id: number, p: number) {
  const c = CHAPTERS[id - 1]
  return c.from + (c.to - c.from) * p
}

/** site.glb animatsiyasining joriy vaqti (soniya). */
export function siteTime() {
  let frames = 0
  for (let i = 1; i <= ANIMATED_CHAPTERS; i++) frames += chapterProgress(i) * FRAMES_PER_CHAPTER
  return frames / FPS
}

/** Kun vaqti: 0 = tun, 1 = tong, 2 = ertalab, 3 = peshin (04 ham), 3.5 = oltin soat, 4 = kechqurun. */
export function timeOfDay() {
  // 05-bobda kechqurun bobning 80% ida to'liq tushadi — final kadr qorong'i fonda, yonib turgan issiqxonalar
  return chapterProgress(1) + chapterProgress(2) + chapterProgress(3) + Math.min(1, chapterProgress(5) / 0.8)
}

/** Kechqurun issiqxonalar ichidan yorug'lik (o'stirish chiroqlari) — 0..1. */
export const glowLevel = () => smooth(range(timeOfDay(), 3.5, 3.92))

/** 05-bob: qo'shni issiqxonalar o'sib chiqadigan oraliq (bob progressida). */
export const estateProgress = () => range(chapterProgress(5), 0.12, 0.5)

/*
 * 04-bob oraliqlari (bob progressida, Blender kadrlari bilan mos):
 *   0.10–0.27 pol va substrat · 0.27–0.43 ekish · 0.43–0.57 sug'orish · 0.57–0.93 o'sish (time-lapse)
 */
export const plantProgress = () => range(chapterProgress(4), 0.27, 0.43)
export const growProgress = () => range(chapterProgress(4), 0.57, 0.93)

/** Tomchilar: sug'orish bosqichida yorqin, keyin sokin davom etadi. */
export function dripLevel() {
  const p = chapterProgress(4)
  return smooth(range(p, 0.43, 0.47)) * (1 - 0.7 * smooth(range(p, 0.6, 0.7)))
}

/** 03-bob: tom ochiq, o'lchovlar ko'rinadigan oraliq (Blender 1486..1650 kadrlari bilan mos). */
export function dimensionsVisible() {
  const p = chapterProgress(3)
  return smooth(range(p, 0.5, 0.54)) * (1 - smooth(range(p, 0.7, 0.74)))
}

/** 02-bobdagi tizimlar — oraliqlar 02-bob progressida (Blender kadrlari bilan mos). */
export const SYSTEMS = [
  { key: 'heat', mat: 'Sys_Heat', from: 0.34, to: 0.5 },
  { key: 'vent', mat: 'Sys_Vent', from: 0.5, to: 0.64 },
  { key: 'water', mat: 'Sys_Water', from: 0.64, to: 0.77 },
  { key: 'auto', mat: 'Sys_Auto', from: 0.77, to: 0.9 },
] as const

/** X-ray ("chizma") rejimi kuchi 0..1. */
export function xray() {
  const p = chapterProgress(2)
  return smooth(range(p, 0.27, 0.34)) * (1 - smooth(range(p, 0.9, 0.97)))
}

/** Tizim hozir qanchalik "faol" (0..1) va keyin qanchalik yonib qoladi. */
export function systemFocus(i: number) {
  const p = chapterProgress(2)
  const s = SYSTEMS[i]
  const fade = 0.025
  return smooth(range(p, s.from, s.from + fade)) * (1 - smooth(range(p, s.to - fade, s.to)))
}

export function systemInstalled(i: number) {
  return smooth(range(chapterProgress(2), SYSTEMS[i].from, SYSTEMS[i].from + 0.04))
}
