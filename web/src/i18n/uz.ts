/**
 * Saytning o'zi yozgan matnlar: menyu, 3D hikoya yozuvlari, kalkulyator, forma yorliqlari.
 * Bo'limlardagi to'liq matnlar asosiy saytdan keladi (data/site-content.*.json, scripts/import-content.mjs).
 * ru.ts va en.ts shu tuzilmaga bo'ysunadi: kalit qolib ketsa, tsc xato beradi.
 */
const uz = {
  meta: {
    title: 'UZ GROW - Agro-Injiniring | Issiqxona qurish va qishloq xo‘jaligi yechimlari',
    description: 'UZ GROW - O‘zbekistonning yetakchi agro-injiniring kompaniyasi. Zamonaviy issiqxonalar, agrotexnologiyalar va qishloq xo‘jaligi uchun kompleks yechimlar. 9+ yillik tajriba, 1500+ muvaffaqiyatli loyiha.',
    keywords: 'issiqxona qurish, agro-injiniring, qishloq xo‘jaligi, UZ GROW, issiqxona turlari, polikarbonat issiqxona, gidroponik, agrobiznes, O‘zbekiston, Toshkent, issiqxona narxlari',
    ogLocale: 'uz_UZ',
    mapLang: 'uz_UZ',
  },
  common: {
    language: 'Til',
    close: 'Yopish',
  },
  nav: {
    label: 'Asosiy menyu',
    groups: { greenhouses: 'Issiqxonalar', services: 'Xizmatlar', projects: 'Loyihalar', company: 'Kompaniya' },
    links: {
      '#issiqxonalar': 'Issiqxona turlari',
      '#ekinlar': 'Ekinlar',
      '#jihozlar': 'Jihozlar',
      '#texnologiya': 'Texnologiyalar',
      '#xizmatlar': 'Barcha xizmatlar',
      '#agro': 'Agro-injiniring',
      '#investorlar': 'Investorlar uchun',
      '#hisob': 'Narxni hisoblash',
      '#loyihalar': 'Loyihalar',
      '#xalqaro': 'Xalqaro hamkorlik',
      '#galereya': 'Galereya',
      '#haqimizda': 'Biz haqimizda',
      '#jamoa': 'Jamoa',
      '#media': 'Media hamkorlik',
    },
    contact: 'Aloqa',
    catalog: 'Katalog',
    catalogPdf: 'Katalog (PDF)',
    estimate: 'Loyiha hisoblash',
    reach: 'Bog‘lanish',
    openMenu: 'Menyuni ochish',
    closeMenu: 'Menyuni yopish',
  },
  chapters: ['Biz haqimizda', 'Xizmatlar', 'Loyihalash', 'Jamoa va natija', 'Qudrat va hamkorlik'],
  /* 3D hikoya yozuvlari — kompaniya haqida (asosiy saytdagi matnlar, LanguageContext.tsx; ekinlar — lib/crops.ts) */
  story: {
    nextChapter: 'Keyingi bob',
    scrollHint: 'Aylantiring: issiqxona ko‘z oldingizda quriladi',
    power: ['yil tajriba', 'muvaffaqiyatli loyiha', 'mutaxassis', 'davlat'],
    hero: {
      eyebrow: '9+ yil tajriba · 1500+ loyiha · 5 davlat',
      title: ['Zamonaviy issiqxona', 'yechimlari'],
      lead: 'O‘zbekistonning yetakchi agro-injiniring kompaniyasi. Loyihalashdan tortib to‘liq ishga tushirishgacha.',
      about: 'Kompaniya bilan tanishish',
      projects: 'Loyihalar',
    },
    aboutChapter: '01 — Biz haqimizda',
    since: {
      title: '2017-yildan beri',
      text: 'UZ GROW — zamonaviy issiqxona qurilishi va agro-injiniring sohasida faoliyat yurituvchi kompaniya. Maqsadimiz — O‘zbekistonda yuqori samaradorlikka ega, innovatsion va eksportbop issiqxona infratuzilmasini rivojlantirish.',
    },
    mission: {
      title: 'Missiyamiz',
      text: 'Mahalliy va xalqaro standartlarga mos, barqaror va rentabelli issiqxona loyihalarini amalga oshirish orqali mijozlar daromadini oshirish.',
    },
    vision: {
      title: 'Vizyonimiz',
      text: 'Markaziy Osiyoda yetakchi agro-injiniring kompaniyaga aylanish va zamonaviy issiqxonalarni eksport qilish.',
    },
    values: {
      title: 'Qadriyatlarimiz',
      items: ['Sifat', 'Innovatsiya', 'Ishonch'],
      text: 'Bizning qadriyatlarimiz — bu bizning ishimiz, madaniyatimiz va kelajak yo‘nalishimiz asosi.',
    },
    about: {
      headline: '9 yildan ortiq tajribaga ega kompaniya 5 ta mamlakatda sizning yoningizda',
      next: { title: '02 — Xizmatlar', sub: 'turnkey · agro-injiniring · jihozlar · konsalting' },
    },
    services: {
      chapter: '02 — Xizmatlar',
      title: 'To‘liq aylanma xizmatlar',
      items: ['Turnkey issiqxona qurish', 'Agro-injiniring', 'Jihozlar', 'Agro-konsalting'],
      text: 'Loyihalashdan tortib to‘liq ishga tushirishgacha — biz bilan hamkorlik qiling va natijaga erishing.',
    },
    equipment: {
      chapter: '02 — Jihozlar va tizimlar',
      title: 'O‘zimiz yetkazamiz, o‘zimiz o‘rnatamiz',
      /* X-ray bosqichida yonadigan 4 tizim (3D'dagi Sys_* materiallari tartibida) */
      systems: {
        heat: { title: 'Isitish va iqlim', text: 'Harorat va namlikni avtomatik nazorat qilish — yil bo‘yi barqaror iqlim.' },
        vent: { title: 'Ventilyatsiya', text: 'Havo almashinuvi va ventilyatsiyani avtomatik boshqaruvchi tizimlar.' },
        water: { title: 'Sug‘orish va o‘g‘itlash', text: 'Tomchilatib sug‘orish va o‘g‘itlash tizimi — suv tejaladi, har bir o‘simlik o‘z ulushini oladi.' },
        auto: { title: 'Avtomatlashtirish', text: 'Smart Climate Control, masofaviy monitoring va ma’lumotlar tahlili — issiqxona to‘liq avtomatlashtiriladi.' },
      },
    },
    team: {
      title: 'Professional jamoa',
      text: 'Professional dizaynerlar, tajribali texnik muhandislar va malakali montaj mutaxassislari. Loyihalashdan o‘rnatish va to‘liq ishga tushirishgacha barcha jarayon qat’iy nazorat ostida.',
      next: { title: '03 — Loyihalash', sub: 'turnkey majmua · konsalting · issiqxona turlari' },
    },
    turnkey: {
      chapter: '03 — Loyihalash',
      title: ['Kalit topshiriladigan', 'majmua'],
      text: 'Xoh aqlli issiqxona, xoh an’anaviy quyosh issiqxonasi — har bir loyiha uchun eng optimal yechim. Ko‘p oraliqli issiqxonalardagi tajribamiz yer maydonidan maksimal foydalanish imkonini beradi.',
    },
    consulting: {
      chapter: '03 — Agro-konsalting',
      items: ['Tekshiruv va tahlil', '3D modellashtirish', 'Texnik hujjatlar', 'Eksport yo‘nalishi', 'Biznes model yaratish'],
    },
    types: {
      chapter: '03 — Issiqxona turlari',
      items: [
        ['Shisha', 'Maksimal yorug‘lik, 20+ yil xizmat'],
        ['Polikarbonat', 'Yengil, yaxshi izolyatsiya, 10–15 yil'],
        ['Plyonka (ko‘p oraliqli)', 'Arzon va tez o‘rnatiladi'],
        ['Quyosh issiqxonasi', 'Energiya tejamkor yechim'],
        ['Ko‘chat issiqxonasi', 'Ekin ekish va ko‘chat yetishtirish uchun'],
        ['Gidroponika', 'Tuproqsiz yetishtirish, suv tejash'],
        ['Aqlli (smart) issiqxona', 'Avtomatlashtirilgan boshqaruv'],
      ],
    },
    open: {
      title: ['Eshigimiz', 'doim ochiq'],
      next: { title: '04 — Jamoa va natija', sub: 'rahbariyat · ekinlar · davlat loyihalari' },
    },
    leaders: {
      chapter: '04 — Rahbariyat',
      items: [
        { name: 'Rustamjon Rahmonov', role: 'Asoschi va Bosh direktor' },
        { name: 'Alisher Majidov', role: 'Marketing direktori' },
        { name: 'Abdulloh Abdurasulov', role: 'Texnik direktor' },
      ],
    },
    founder: {
      chapter: '04 — Asoschi',
      name: 'Rustamjon Rahmonov',
      bio: 'O‘zbekistonlik innovator agrofaol va tadbirkor. 2017-yildan beri Markaziy Osiyo agrosektorida minglab fermerlar va agrobiznes vakillariga ma’lumot, ishonch va natija olib kelmoqda.',
      chips: ['200 000+ obunachi', '1500+ muvaffaqiyatli loyiha'],
    },
    crops: {
      chapter: '04 — Ekinlar',
      title: 'Har bir ekin uchun optimal yechim',
      items: ['Pomidor', 'Bodring', 'Qulupnay', 'Ko‘katlar', 'Ko‘chat'],
    },
    /* Prezident tashriflari uchun qurilgan loyihalar (asosiy saytdagi loyihalar ro'yxatidan) */
    presidential: {
      chapter: '04 — Davlat darajasidagi loyihalar',
      items: [
        { name: 'Surxondaryo Agro Majmuasi', note: 'Prezident tashrifi uchun · 3 ta issiqxona', year: '2023' },
        { name: 'Samarqand Agro Majmuasi', note: 'Prezident tashrifi va tadbirkorlar uchrashuvi · 2 ta issiqxona', year: '2024' },
        { name: 'Andijon Vodiy Loyihasi', note: '7 ta zamonaviy issiqxona majmuasi', year: '2022–2024' },
      ],
    },
    result: {
      chapter: '04 — Natija',
      title: 'Mijoz daromadi — bizning natijamiz',
      text: 'Hosildorlikni oshirish, xarajatlarni kamaytirish va barqaror daromadni ta’minlaydigan tizimlar yaratamiz — oddiy xizmat emas, o‘z ishiga mas’uliyat bilan yondashadigan jamoa.',
      next: { title: '05 — Qudrat va hamkorlik', sub: 'xalqaro loyihalar · raqamlar · aloqa' },
    },
    intl: {
      chapter: '05 — Xalqaro hamkorlik',
      title: ['O‘zbekistondan —', 'Markaziy Osiyoga'],
      /* Xalqaro yo'nalishlar (asosiy saytdagi "Loyihalar geografiyasi") */
      items: ['Qozog‘iston', 'Qirg‘iziston', 'Tojikiston', 'Turkmaniston'],
    },
    numbers: { chapter: '05 — Raqamlarda' },
    final: {
      title: ['Sizning loyihangizni', 'ham quramiz'],
      about: 'Kompaniya haqida',
      contact: 'Bog‘lanish',
    },
  },
  weather: {
    title: 'Ob-havo',
    choose: 'Ob-havoni tanlash',
    panel: 'Ob-havo paneli',
    kinds: { clear: 'Ochiq', cloudy: 'Bulutli', rain: 'Yomg‘ir', snow: 'Qor', fog: 'Tuman' },
    liveHint: 'Toshkentdagi hozirgi ob-havo',
    loading: 'Olinmoqda…',
    failed: 'Ulanmadi',
    liveNow: 'Toshkent, hozir',
    city: 'Toshkent',
  },
  fab: {
    call: 'Qo‘ng‘iroq',
    contact: 'Biz bilan bog‘lanish',
  },
  /* 03-bob: tepadan ko'rinishdagi o'lchov yozuvlari */
  dims: {
    width: { text: '40 m', hint: 'eni' },
    length: { text: '40 m', hint: 'uzunligi' },
    area: { text: '1 600 m²', hint: 'maydon' },
  },
  /* 3D hikoyadan keyingi bo'limlardagi, asosiy saytda bo'lmagan yorliqlar */
  after: {
    expoAlt: 'UZ GROW ko‘rgazma stendi',
    officeAlt: 'UZ GROW issiqxona majmuasi',
    videoLabel: 'UZ GROW loyihalaridan lavhalar',
    typeColumn: 'Tur',
    complexityColumn: 'Murakkablik',
    location: 'Joylashuv',
    area: 'Maydon',
    year: 'Yil',
    statusDone: 'Tugallangan',
    statusProgress: 'Jarayonda',
    projectFilter: 'Loyiha turi',
    million: (v: number) => `$${v}M`,
    mapLabel: 'O‘zbekiston xaritasi: UZ GROW loyihalari',
    mapPins: ['Surxondaryo', 'Andijon', 'Samarqand', 'Toshkent', 'Qashqadaryo', 'Termiz'],
    intlTitle: 'O‘zbekistondan Markaziy Osiyoga',
    galleryTitle: 'Ishimiz o‘z ko‘zingiz bilan',
    galleryTabs: 'Galereya bo‘limi',
    galleryAll: 'Barchasi',
    galleryZoom: 'Rasmni kattalashtirish',
    galleryAlt: 'UZ GROW loyihasi',
    galleryMore: 'Yana ko‘rsatish',
    prev: 'Oldingi',
    next: 'Keyingi',
    mediaEyebrow: 'Media hamkorlik',
    mediaRegions: 'O‘zbekiston, Rossiya, Qozog‘iston, Qirg‘iziston, Tojikiston',
    region: 'Viloyat',
    regionPick: 'Tanlang',
    regions: ['Toshkent shahri', 'Toshkent viloyati', 'Andijon', 'Buxoro', 'Farg‘ona', 'Jizzax', 'Xorazm', 'Namangan', 'Navoiy', 'Qashqadaryo', 'Qoraqalpog‘iston', 'Samarqand', 'Sirdaryo', 'Surxondaryo', 'Boshqa davlat'],
    workHours: [
      ['Dushanba – Juma', '9:00 – 18:00'],
      ['Shanba', '9:00 – 15:00'],
      ['Yakshanba', 'Dam olish kuni'],
    ],
    footerText: 'Zamonaviy issiqxona yechimlari. O‘zbekistonning yetakchi agro-injiniring kompaniyasi.',
  },
  calc: {
    eyebrow: 'Loyiha kalkulyatori',
    title: 'Sizning issiqxonangiz qancha turadi?',
    lead: 'Maydon, ekin va isitish turini tanlang: taxminiy hisob darhol chiqadi.',
    area: 'Maydon',
    m2: 'm²',
    hectare: 'ga',
    crop: 'Ekin turi',
    heating: 'Isitish',
    crops: { tomato: 'Pomidor', cucumber: 'Bodring', strawberry: 'Qulupnay', greens: 'Ko‘kat' },
    heatings: { gas: 'Gaz qozonxona', heatpump: 'Issiqlik nasosi', none: 'Isitishsiz (mavsumiy)' },
    note: 'Hisob 1600 m² namuna loyiha smetasiga asoslangan va taxminiy: aniq narx joy, loyiha va uskunalarga bog‘liq. Mutaxassisimiz bepul aniq hisob tayyorlaydi.',
    investment: 'Taxminiy investitsiya (QQS bilan)',
    perM2: 'isitish, sug‘orish va avtomatika bilan',
    harvest: 'Yillik hosil',
    tons: 't',
    revenue: 'Yillik daromad',
    payback: 'Qoplash muddati',
    years: (v: string) => `${v} yil`,
    apply: 'Shu hisob bilan ariza qoldirish',
    summary: (s: { area: string; crop: string; heating: string; total: string; perM2: string; harvest: string }) =>
      `Kalkulyator: ${s.area} m², ${s.crop}, ${s.heating}. Taxminiy investitsiya ${s.total} QQS bilan (≈ ${s.perM2}/m²), hosil ≈ ${s.harvest} t/yil.`,
  },
}

export type Strings = typeof uz
export default uz
