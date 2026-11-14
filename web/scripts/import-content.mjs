// Asosiy sayt (Desktop/uzgrowlast-main-1) matnlarini qayta yozmasdan oladi: contexts/LanguageContext.tsx dagi
// uz, ru va en bo'limlarini o'qiydi, har bir til uchun tutuq belgilarini to'g'rilaydi, ochiq-oydin xatolarni tuzatadi.
//   node scripts/import-content.mjs [asosiy-sayt-papkasi]
// Natija: src/data/site-content.{uz,ru,en}.json. Asosiy saytda matn o'zgarsa, shu skriptni qayta ishga tushiring.
import { readFileSync, writeFileSync } from 'node:fs'

const MAIN = process.argv[2] ?? 'C:/Users/ghost/Desktop/uzgrowlast-main-1'
const src = readFileSync(`${MAIN}/contexts/LanguageContext.tsx`, 'utf8').replace(/\r\n/g, '\n')

function block(lang, endMark) {
  const start = src.indexOf(`\n  ${lang}: {`)
  const body = src.slice(start, src.indexOf(endMark, start))
  return new Function(`return (${body.slice(body.indexOf('{'), body.lastIndexOf('}') + 1)})`)()
}

const replaceAll = (fixes, s) => fixes.reduce((t, [a, b]) => t.split(a).join(b), s)

// Matndagi yozuv xatolari. Eng muhimi — foydalanish shartlaridagi ma'noni teskari qiladigan jumla.
const FIXES_UZ = [
  ['faqat qonunga zid ravishda foydalanishingiz', 'faqat qonunga muvofiq ravishda foydalanishingiz'],
  ['roziligiz', 'roziligingiz'],
  ['kelajasiga', 'kelajagiga'],
  ['investorguruhlar', 'investor guruhlari'],
  ["Qirg'iston", "Qirg'iziston"],
  ['Toshkent, Almata', 'Toshkent, Olmaota'],
  ['Hydroponika', 'Gidroponika'],
  ['Gidroponik"', 'Gidroponika"'],
  ['kompanilar', 'kompaniyalar'],
]

// Ingliz matnida qolib ketgan o'zbekcha so'zlar va xalqaro bo'limdagi davlat nomi (xaritadagi nom bilan bir xil bo'lishi kerak)
const FIXES_EN = [
  ['Turkmanistan', 'Turkmenistan'],
  ['CO₂ generatori', 'CO₂ generator'],
  ['Aeroponika', 'Aeroponics'],
]

const TYPO = {
  uz: (s) =>
    replaceAll(FIXES_UZ, s)
      .replace(/([oOgG])['’`]/g, '$1‘')
      .replace(/(\p{L})['’`](\p{L})/gu, '$1’$2'),
  // Ruscha yozuvda o'nlik kasr vergul bilan, minglik bo'sh joy bilan ("1C 8.3.0" kabi versiyalarga tegmaydi)
  ru: (s) => s.replace(/(?<![\d.])(\d+)\.(\d+)(?![\d.])/g, '$1,$2').replace(/(?<![\d,])(\d{1,3}),(\d{3})(?!\d)/g, '$1\u00a0$2'),
  en: (s) => replaceAll(FIXES_EN, s).replace(/(\p{L})['`]/gu, '$1’'),
}

function clean(v, typo) {
  if (typeof v === 'string') return /^(https?:|\/|\+)/.test(v) ? v : typo(v)
  if (Array.isArray(v)) return v.map((x) => clean(x, typo))
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x, typo)]))
  return v
}

// Saytda ishlatilmaydigan bo'limlar: faqat admin va UI yorliqlari
const KEEP = ['hero', 'about', 'services', 'map', 'projects', 'team', 'greenhouse', 'technology', 'contact', 'footer', 'media', 'privacy', 'terms', 'internationalPage', 'agro', 'investor', 'galleryPage', 'servicesPage', 'cropsPage', 'homeBlocks', 'techPage']

const SOURCES = { uz: block('uz', '// RUSSIAN'), ru: block('ru', '// ENGLISH'), en: block('en', '\n};') }
for (const [lang, data] of Object.entries(SOURCES)) {
  const out = Object.fromEntries(KEEP.map((k) => [k, clean(data[k], TYPO[lang])]))
  writeFileSync(new URL(`../src/data/site-content.${lang}.json`, import.meta.url), JSON.stringify(out))
  console.log(`tayyor (${lang}):`, Object.keys(out).length, 'bo‘lim,', Math.round(JSON.stringify(out).length / 1024), 'KB')
}
