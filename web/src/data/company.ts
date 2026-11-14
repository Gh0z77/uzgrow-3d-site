/**
 * Aloqa, bosh raqamlar va kalkulyator stavkalari: tilga bog'liq bo'lmagan qiymatlar.
 * Matnlar: i18n/{uz,ru,en}.ts (hikoya yozuvlari, yorliqlar) va site-content.*.json (bo'limlar).
 *
 * Manba: asosiy sayt www.uzgrow.uz (Desktop/uzgrowlast-main-1):
 *   contexts/LanguageContext.tsx — aloqa, ijtimoiy tarmoqlar, loyihalar matni
 *   components/hero.tsx, about.tsx — 9+ / 1500+ / 50+ / 5+ raqamlari
 *   components/projects.tsx      — loyihalar yili;  lib/media-registry.ts — loyiha rasmlari
 * Asosiy saytda biror narsa o'zgarsa, shu faylni ham yangilang.
 *
 * Istisno: CALC (kalkulyator stavkalari) asosiy saytda yo'q — taxminiy qiymatlar.
 */
export const CONTACT = {
  phones: ['+998 55 515 22 23', '+998 99 435 23 13'],
  phoneHref: 'tel:+998555152223',
  telegram: 'Uz_Grow', // t.me/<telegram>
  email: 'uzgrrow@gmail.com',
  mapUrl: 'https://yandex.uz/maps/?rtext=~41.243669%2C69.290648&rtt=auto',
  website: 'https://www.uzgrow.uz',
  social: [
    { name: 'Telegram', href: 'https://t.me/Uz_Grow' },
    { name: 'Instagram', href: 'https://www.instagram.com/uz.grow' },
    { name: 'YouTube', href: 'https://youtube.com/@rustamjonrakhmonov' },
    { name: 'Facebook', href: 'https://www.facebook.com/share/1DePjLwX79/' },
    { name: 'TikTok', href: 'https://www.tiktok.com/@uz.grow' },
  ],
}

/** Asosiy saytdagi bosh ko'rsatkichlar (hero va "Biz haqimizda" bo'limlari). */
export const POWER = [
  { value: 9, suffix: '+' },
  { value: 1500, suffix: '+' },
  { value: 50, suffix: '+' },
  { value: 5, suffix: '+' },
]

/**
 * Kalkulyator stavkalari — hujjatlar/UZGROW_issiqxona_40x40_smeta.xlsx dan (narxlari TAXMINIY).
 * Investitsiya = (fixed + area × (perM2 + isitish.perM2)) × (1 + contingency) × (1 + vat):
 *   fixed  — maydonga bog'liq bo'lmagan pozitsiyalar: loyiha 2500, transport 2500, ishga tushirish 1500,
 *            iqlim kompyuteri 3800, meteostansiya 1900, o'g'itlash uzeli 6500, suv idishi 4500 = 23 200 $
 *   perM2  — smetaning qolgan qismi isitishsiz: (147 893 − 23 200 − 33 166) / 1600 = 57.2 $/m²
 *   gas    — VI bo'lim "Isitish": 33 166 / 1600 = 20.7 $/m²
 *   heatpump — smetada yo'q, taxminiy: ~350 kVt nasos tizimi ≈ 85 000 $ → 53 $/m²
 * Tekshiruv: 1600 m², gaz → 173 9xx $ (smetadagi "Hammasi, QQS bilan" bilan bir xil).
 * Smeta narxlari o'zgarsa, shu qiymatlarni ham yangilang.
 * yield — kg/m²/yil; price — $/kg; opex — daromaddan xarajat ulushi (smetada yo'q, taxminiy).
 */
export const CALC = {
  fixed: 23200,
  perM2: 57.2,
  contingency: 0.05,
  vat: 0.12,
  heating: [
    { key: 'gas', perM2: 20.7, yieldK: 1 },
    { key: 'heatpump', perM2: 53, yieldK: 1 },
    { key: 'none', perM2: 0, yieldK: 0.45 },
  ],
  crops: [
    { key: 'tomato', yield: 40, price: 0.8 },
    { key: 'cucumber', yield: 50, price: 0.6 },
    { key: 'strawberry', yield: 7, price: 3.5 },
    { key: 'greens', yield: 18, price: 1.5 },
  ],
  opex: 0.55,
  area: { min: 1000, max: 100000, step: 500, default: 10000 },
} as const
