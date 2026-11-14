/**
 * Asosiy saytda (Desktop/uzgrowlast-main-1) matnlar faylida emas, komponentlarda yozilgan qiymatlar va rasmlar.
 * Manbalar: lib/media-registry.ts, lib/gallery-items.ts, components/projects.tsx, app/investorlar/page.tsx,
 * app/texnologiya/page.tsx, components/asso-design-media.tsx, components/contact.tsx, lib/catalog.ts.
 * Rasm yo'llari asosiy saytning public/ papkasiga nisbatan: scripts/import-media.mjs shularni topib siqadi.
 */
import type { Strings } from '../i18n/uz'

export const CATALOG_URL = 'https://drive.usercontent.google.com/download?id=1HErqszuF53VmZMGFVHg9mOFhM0y_G50L&export=download&authuser=0'
export const TAPLINK_URL = 'https://taplink.cc/uzgrow'
export const WHATSAPP_PHONE = '998994352313'
export const MEDIA_PHONE = { label: '+998 93 435-23-13', href: 'tel:+998934352313' }
export const MAP_EMBED = 'https://yandex.uz/map-widget/v1/org/uzgrow/29834406058/?ll=69.290648%2C41.243669&z=16'
export const COORDS = '41.243669, 69.290648'

export const BIG_PHOTOS = {
  hero: 'images/site/hero-1.jpg',
  expo: 'images/site/expo-stend.jpg',
  office: 'images/photo_2026-04-04_10-35-29.jpg',
  inside: 'images/site/issiqxona-ichi.jpg',
  president: 'images/site/prezident-uchrashuv.jpg',
  cta: 'images/site/hero-3.jpg',
  team: 'images/site/cl-IMG_4429_copy_dqhz5y.jpg',
}

export const SERVICE_PHOTOS = ['images/8.jpg', 'images/site/hero-2.jpg', 'images/site/jihoz-shkaf.jpg', 'images/site/ekin-qulupnay.jpg']

/** Asosiy saytda ko'rsatiladigan 4 ta tur: rasmlari bilan (greenhouse-types.tsx). */
export const TYPE_CARDS: { key: string; photos: string[] }[] = [
  { key: 'gektar', photos: ['images/photo_2026-04-04_10-35-55.jpg', 'images/site/cl-IMG_4397_copy_fymoco.jpg', 'images/site/cl-2_nqvejm.jpg'] },
  { key: 'oddiy', photos: ['images/photo_2026-04-04_10-35-25.jpg', 'images/photo_2026-04-04_10-35-50.jpg', 'images/photo_2026-04-04_10-35-53.jpg'] },
  { key: 'mini', photos: ['images/24.jpg', 'images/25.jpg', 'images/27.jpg'] },
  { key: 'vertical', photos: ['images/site/cl-IMG_0980_adj1rq.jpg', 'images/1.jpg', 'images/7.jpg'] },
]

/** Qiyosiy jadvaldagi turlar (matnlar faylida bor: greenhouse.*). */
export const TYPE_TABLE = ['glass', 'polycarbonate', 'film', 'tunnel', 'oddiy', 'mini', 'gektar', 'industrial', 'hydroponic']

export const CROP_PHOTOS: Record<string, string> = {
  pomidor: 'images/site/ekin-tomat.jpg',
  bodring: 'images/site/ekin-bodring.jpg',
  qulupnay: 'images/site/ekin-qulupnay.jpg',
  kokatlar: 'images/site/ekin-sabzavot.jpg',
  kochat: 'images/site/gallery-25.jpg',
}

export const EQUIPMENT_ITEMS: { key: string; photo: string }[] = [
  { key: 'heating', photo: 'images/site/jihoz-isitish.jpg' },
  { key: 'ventilation', photo: 'images/site/jihoz-ventilyatsiya.jpg' },
  { key: 'shelving', photo: 'images/site/jihoz-stellaj.jpg' },
  { key: 'irrigation', photo: 'images/site/jihoz-sugorish.jpg' },
  { key: 'automation', photo: 'images/site/jihoz-avtomatika.jpg' },
]

/** techPage.benefits tartibida (app/texnologiya/page.tsx). */
export const TECH_BENEFITS = ['30%', '40%', '25%', '50%']

export const PROJECT_META: { year: string; status: 'done' | 'progress'; category: string; investment: number; featured?: boolean; lat: number; lon: number; photos: string[] }[] = [
  {
    year: '2023', status: 'done', category: 'presidential', investment: 1.2, featured: true, lat: 38.0, lon: 67.6,
    photos: ['images/site/cl-IMG_4397_copy_fymoco.jpg', 'images/site/cl-2_nqvejm.jpg', 'images/site/cl-IMG_4392_copy_xwrtpy.jpg', 'images/site/cl-IMG_4429_copy_dqhz5y.jpg'],
  },
  {
    year: '2022–2024', status: 'done', category: 'greenhouse', investment: 2.5, lat: 40.78, lon: 72.34,
    photos: ['images/site/cl-IMG_4429_copy_dqhz5y.jpg', 'images/site/cl-IMG_1075_rrylu1.jpg', 'images/site/cl-IMG_3535_zs9roq.jpg', 'images/25.jpg', 'images/27.jpg'],
  },
  {
    year: '2024', status: 'done', category: 'presidential', investment: 1.8, featured: true, lat: 39.65, lon: 66.96,
    photos: ['images/site/qulupnay-issiqxona.jpg', 'images/site/ekin-qulupnay.jpg', 'images/site/prezident-issiqxona.jpg', 'images/site/issiqxona-ichi.jpg'],
  },
  {
    year: '2024', status: 'progress', category: 'international', investment: 3.2, lat: 41.31, lon: 69.28,
    photos: ['images/site/cl-IMG_3535_zs9roq.jpg', 'images/site/cl-IMG_0976_kkvp42.jpg', 'images/site/cl-IMG_1052_qr8w62.jpg', 'images/site/cl-IMG_0980_adj1rq.jpg', 'images/1.jpg'],
  },
  {
    year: '2024', status: 'done', category: 'greenhouse', investment: 1.5, lat: 38.86, lon: 65.79,
    photos: ['images/2.jpg', 'images/3.jpg'],
  },
  {
    year: '2023', status: 'done', category: 'agriculture', investment: 2.1, lat: 37.3, lon: 67.2,
    photos: ['images/site/cl-IMG_1075_rrylu1.jpg', 'images/site/cl-IMG_3535_zs9roq.jpg', 'images/site/cl-IMG_0976_kkvp42.jpg', 'images/site/cl-IMG_1052_qr8w62.jpg', 'images/site/cl-IMG_0980_adj1rq.jpg'],
  },
]

export const INTL_PHOTOS = ['images/site/cl-IMG_4392_copy_xwrtpy.jpg', 'images/1.jpg', 'images/photo_2026-04-04_10-35-53.jpg', 'images/site/cl-2_nqvejm.jpg']

export const TEAM_ORDER: { key: string; photo?: string }[] = [
  { key: 'rustamjon', photo: 'team/ceo.jpg' },
  { key: 'alisher', photo: 'team/marketolog.jpg' },
  { key: 'abdulloh', photo: 'team/abdulloh.jpg' },
  { key: 'nafosat', photo: 'team/nafosat.jpg' },
  { key: 'dilnoza', photo: 'team/dilnoza.jpg' },
  { key: 'sardor', photo: 'team/sardor.jpg' },
]

/** app/investorlar/page.tsx: model tartibida. */
export const INVESTOR_MODELS = [
  { min: 100000, roi: '25-35%', popular: true },
  { min: 25000, roi: '18-25%' },
  { min: 50000, roi: '20-30%' },
]

/** components/asso-design-media.tsx */
export const MEDIA_STATS = {
  platforms: [
    { name: 'YouTube', value: '122k+', href: 'https://youtube.com/@rustamjonrakhmonov' },
    { name: 'Instagram', value: '74.5k+', href: 'https://www.instagram.com/uz.grow' },
    { name: 'TikTok', value: '16k+', href: 'https://www.tiktok.com/@uz.grow' },
    { name: 'Telegram', value: '1.5k+', href: 'https://t.me/Uz_Grow' },
  ],
  reach: 150000,
  age: '25-55',
  women: 87,
  men: 13,
}

/** Rasm + galereyadagi yozuv (galleryPage.items indeksi) + bo'lim. lib/gallery-items.ts tartibida. */
export const GALLERY: { photo: string; index: number; tab: 'projects' | 'samarqand' }[] = [
  ...['images/1.jpg', 'images/2.jpg', 'images/3.jpg', 'images/4.jpg', 'images/7.jpg', 'images/8.jpg', 'images/24.jpg', 'images/25.jpg', 'images/27.jpg'].map((photo, index) => ({ photo, index, tab: 'projects' as const })),
  ...['images/site/prezident-issiqxona.jpg', 'images/site/prezident-qatorlar.jpg', 'images/site/prezident-uchrashuv.jpg', 'images/site/prezident-hujjat.jpg', 'images/site/qulupnay-issiqxona.jpg', 'images/site/prezident-qulupnay.jpg'].map((photo, i) => ({ photo, index: 9 + i, tab: 'samarqand' as const })),
  ...['images/site/ekin-tomat.jpg', 'images/site/ekin-bodring.jpg', 'images/site/ekin-sabzavot.jpg', 'images/site/ekin-qulupnay.jpg', 'images/site/gallery-25.jpg', 'images/site/gallery-26.jpg', 'images/site/gallery-27.jpg', 'images/site/gallery-28.jpg', 'images/site/gallery-29.jpg', 'images/site/gallery-30.jpg', 'images/photo_2026-04-04_10-35-50.jpg', 'images/photo_2026-04-04_10-35-54.jpg', 'images/site/cl-IMG_1075_rrylu1.jpg', 'images/site/cl-IMG_3535_zs9roq.jpg', 'images/site/cl-IMG_0976_kkvp42.jpg', 'images/site/cl-IMG_1052_qr8w62.jpg', 'images/site/cl-IMG_1015_jf5dqm.jpg', 'images/site/cl-IMG_0994_angy5l.jpg', 'images/site/cl-IMG_1033_akpcc1.jpg', 'images/site/cl-IMG_1030_dcuj82.jpg', 'images/site/cl-IMG_1001_vft7io.jpg', 'images/site/cl-IMG_1059_wwp8bn.jpg'].map((photo) => ({ photo, index: -1, tab: 'projects' as const })),
]

/** Bosh sahifadagi to'liq ekran video (hero.tsx): faqat ko'rinayotganda yuklanadi. */
export const VIDEO = { src: '/media/hero.mp4', portrait: '/media/hero-vertical.mp4', poster: 'images/site/hero-4.jpg' }

export const NAV_GROUPS: { key: keyof Strings['nav']['groups']; items: (keyof Strings['nav']['links'])[] }[] = [
  { key: 'greenhouses', items: ['#issiqxonalar', '#ekinlar', '#jihozlar', '#texnologiya'] },
  { key: 'services', items: ['#xizmatlar', '#agro', '#investorlar', '#hisob'] },
  { key: 'projects', items: ['#loyihalar', '#xalqaro', '#galereya'] },
  { key: 'company', items: ['#haqimizda', '#jamoa', '#media'] },
]
