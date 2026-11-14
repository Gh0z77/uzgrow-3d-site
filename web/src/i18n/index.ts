import { useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { keepPlace } from '../scroll'
import uz, { type Strings } from './uz'

/**
 * Tanlangan til. Birinchi ekran yengil qolishi uchun faqat o'zbekcha yozuvlar asosiy paketda;
 * ruscha va inglizcha yozuvlar hamda har bir tilning to'liq matni (site-content.*.json) kerak bo'lganda yuklanadi.
 * Til faqat kerakli fayllar kelgandan keyin almashadi: sahifada bir lahza ham ikki til aralashmaydi.
 */
export type Lang = 'uz' | 'ru' | 'en'
export type SiteContent = typeof import('../data/site-content.uz.json')

export const LANGS: { code: Lang; short: string; name: string }[] = [
  { code: 'uz', short: 'UZ', name: 'O‘zbekcha' },
  { code: 'ru', short: 'RU', name: 'Русский' },
  { code: 'en', short: 'EN', name: 'English' },
]

const STORE_KEY = 'uzgrow-lang'

const STRINGS: Partial<Record<Lang, Strings>> = { uz }
const STRING_FILES = { ru: () => import('./ru'), en: () => import('./en') }

const CONTENT: Partial<Record<Lang, SiteContent>> = {}
const CONTENT_FILES: Record<Lang, () => Promise<{ default: unknown }>> = {
  uz: () => import('../data/site-content.uz.json'),
  ru: () => import('../data/site-content.ru.json'),
  en: () => import('../data/site-content.en.json'),
}

function savedLang(): Lang {
  try {
    const saved = localStorage.getItem(STORE_KEY)
    if (LANGS.some((l) => l.code === saved)) return saved as Lang
  } catch {
    /* maxfiy oynada localStorage yopiq bo'lishi mumkin */
  }
  return 'uz'
}

let lang: Lang = savedLang()
let wanted = lang
const listeners = new Set<() => void>()

async function loadStrings(l: Lang) {
  if (STRINGS[l] || l === 'uz') return
  STRINGS[l] = (await STRING_FILES[l]()).default
}

export async function loadContent(l: Lang = lang) {
  if (!CONTENT[l]) CONTENT[l] = (await CONTENT_FILES[l]()).default as SiteContent
}

function applyToDocument() {
  const m = STRINGS[lang]!.meta
  const root = document.documentElement
  root.lang = lang
  document.title = m.title
  const set = (selector: string, value: string) => document.querySelector(selector)?.setAttribute('content', value)
  set('meta[name="description"]', m.description)
  set('meta[name="keywords"]', m.keywords)
  set('meta[property="og:title"]', m.title)
  set('meta[property="og:description"]', m.description)
  set('meta[property="og:locale"]', m.ogLocale)
}

/** Sahifa chizilishidan oldin saqlangan tilning yozuvlarini tayyorlaydi. Yuklanmasa, o'zbekcha ochiladi. */
export async function initLang() {
  try {
    await loadStrings(lang)
  } catch {
    lang = wanted = 'uz'
  }
  applyToDocument()
}

export async function setLang(next: Lang) {
  wanted = next
  try {
    await Promise.all([loadStrings(next), loadContent(next)])
  } catch {
    return // internet uzilgan: joriy til qoladi
  }
  if (wanted !== next || lang === next) return // shu orada boshqa til bosilgan
  try {
    localStorage.setItem(STORE_KEY, next)
  } catch {
    /* saqlanmasa ham til almashadi */
  }
  keepPlace(() => {
    lang = next
    applyToDocument()
    flushSync(() => listeners.forEach((fn) => fn()))
  })
}

export const getLang = () => lang

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export const useLang = () => useSyncExternalStore(subscribe, getLang)

/** Saytning o'z yozuvlari joriy tilda. */
export function useT() {
  return STRINGS[useLang()]!
}

/** Asosiy saytdan olingan to'liq matnlar. Til faqat shu fayl yuklangandan keyin almashadi. */
export function useSite() {
  return CONTENT[useLang()]!
}

const numberLocale = () => (lang === 'en' ? 'en-US' : 'ru-RU')

/** Raqam joriy til qoidasi bilan: "10 000" va "2,5" yoki "10,000" va "2.5". */
export const formatNumber = (v: number, digits?: number) =>
  v.toLocaleString(numberLocale(), digits === undefined ? undefined : { minimumFractionDigits: digits, maximumFractionDigits: digits })
