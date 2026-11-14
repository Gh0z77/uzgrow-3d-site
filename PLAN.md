# UZ GROW — 3D kinematik scroll sayt: reja

## G'oya (bir jumlada)
Sayt bitta uzluksiz "kino": foydalanuvchi scroll qilgani sari bo'sh dalada issiqxona qad ko'taradi,
ichiga kiramiz, ko'chatlar ekiladi, o'sadi, hosil beradi — oxirida esa UZ GROW qurgan ulkan majmualar
panoramasi va "Sizning loyihangizni ham quramiz" chaqirig'i.

Butun hikoya **vaqt o'tishi** bilan bog'lanadi: tun → tong → kun → oltin soat (golden hour).
Yorug'lik o'zgarishi kinematik his beradi va "jarayon" ni sezdiradi.

---

## 1. Texnik yo'l (asosiy qaror)

**Blender'da sahna va animatsiya → GLB eksport → brauzerda Three.js scroll bilan "o'ynatadi".**

| Qatlam | Vosita | Vazifasi |
|---|---|---|
| 3D sahna, animatsiya, kamera yo'li | **Blender 5.2** (MCP orqali ulangan) | Issiqxona, qurilish animatsiyasi, tizimlar, o'simliklar, kamera harakati |
| Yorug'lik sifati | Blender Cycles **bake** (AO + lightmap) | Real-time'da ham "render" sifati, lekin tez ishlaydi |
| Web 3D | **React Three Fiber + drei** (Three.js) | GLB'ni yuklash, animatsiyani scroll'ga bog'lash |
| Scroll | **GSAP ScrollTrigger + Lenis** | Silliq (inertsiyali) scroll, aniq bo'lim chegaralari |
| Effektlar | postprocessing | Bloom, vignette, yengil DOF, film grain |
| Loyiha | Vite + React (+ TypeScript) | Tez, yengil |
| Hosting | Vercel | Bepul, tez CDN |
| Forma | Vercel serverless → **Telegram bot** | Arizalar to'g'ridan-to'g'ri Telegram'ga |

**Nega aynan shu yo'l?**
- Scroll = Blender timeline. Scroll 0–100% → Blender kadr 0–N. Blender'da nima animatsiya qilsak, saytda
  aynan shu silliq o'ynaydi. Kamera ham Blender'da yo'naltiriladi — haqiqiy operator ishi kabi.
- Muqobil "rendered kadrlar ketma-ketligi" (Apple uslubi) juda chiroyli, lekin 40–80 MB og'ir va
  interaktiv emas. Shuning uchun uni faqat **zaxira** sifatida (zaif telefonlar / video) ishlatamiz.

**Silliqlik qoidalari:**
- Scroll qiymati to'g'ridan-to'g'ri emas, **damping (lerp)** bilan beriladi → "yog'dek" harakat.
- O'simliklar, karkas ustunlari, quvurlar — **InstancedMesh** (minglab nusxa, bitta draw call).
- Geometriya Draco/meshopt, teksturalar KTX2 bilan siqiladi. Byudjet: jami < 15 MB, < 300k uchburchak.
- Har bo'lim alohida GLB, keyingisi oldindan fonda yuklanadi.
- GPU darajasi aniqlanadi (detect-gpu): zaif qurilmada DPR va effektlar pasaytiriladi.
- Matnlar HTML'da (canvas'da emas) → SEO va o'qilishi yaxshi. `prefers-reduced-motion` uchun oddiy versiya.

---

## 2. Sahnalar (sizning rejangiz + kuchaytirish)

### 00 — Preloader (yuklanish)
Qora ekran, UZ GROW logotipi yupqa yashil chiziqlardan "chizilib" boriladi (yuklanish foizi bilan bog'liq).
Yuklanib bo'lgach logotip parchalanib, yulduzli tun osmoniga aylanadi → 01-sahnaga o'tadi.

### 01 — Noldan boshlash (0–15%) · **tun → tong**
- Keng dala, tuman, havoda chang zarralari. Uzoqda UZ GROW logotipi (yorug' belgisi).
- Kamera yer sathida, sekin oldinga suriladi.
- Scroll: yer tekislanadi (relyef silliqlanadi) → poydevor qatorlari "o'sib chiqadi" → metall ustunlar
  pastdan yuqoriga ketma-ket ko'tariladi (stagger) → fermalar ulanadi.
- Ekskavator, kran, ishchi siluetlari harakatda (low-poly, kino uchun yetarli).
- Matn: *"Har bir loyiha — puxta poydevordan boshlanadi."* + hisoblagich: **N+ yil tajriba**.

### 02 — Muhandislik kuchi (15–35%) · **tong**
- Karkasga polikarbonat/shisha panellar qatorma-qator o'rnatiladi (shaffof, yorug'lik sinadi).
- **"X-ray" rejim**: qoplama yarim shaffof bo'ladi, ichki tizimlar navbatma-navbat yonadi:
  🔥 isitish (to'q sariq quvurlar, issiqlik to'lqini shader) → 🌬 ventilyatsiya (aylanuvchi ventilyatorlar,
  havo oqimi chiziqlari) → 💧 suv/tomchi quvurlari (ko'k oqim) → 🖥 avtomatik boshqaruv (sensorlar, ma'lumot chiziqlari).
- Har tizim yonganda yon tomonda kartochka chiqadi: nomi + 1 qator foyda + raqam.

### 03 — Tayyor issiqxona (35–55%) · **kun**
- Kamera dronday yuqoriga ko'tarilib, majmua atrofida yarim aylanadi (orbit).
- Tom panellari ko'tarilib/eriydi — ichki qism tepadan ko'rinadi.
- Katta animatsion raqamlar: **maydon (ga / m²)**, **yillik sig'im (tonna)**, **qurilish muddati**,
  **energiya tejamkorligi (%)**. Raqamlar 0 dan sanab chiqadi.

### 04 — Issiqxona ichiga sayohat (55–75%) · **kun → time-lapse**
- Kamera eshik orqali ichkariga kiradi (dolly shot).
- Substrat/tuproq to'shaklari to'ladi → ko'chatlar qatorma-qator "tushib" ekiladi.
- Tomchilatib sug'orish ishga tushadi (tomchi zarralari, yerga tegib yaltiraydi).
- **Time-lapse**: quyosh soyalari tez harakatlanadi, o'simliklar o'sadi (4 bosqich: ko'chat → barg →
  gul → meva), pomidor/bodring/qulupnay paydo bo'ladi va pishib qizaradi.

### 05 — Natija va kompaniya qudrati (75–100%) · **oltin soat**
- Kamera tomdan chiqib, baland ko'tariladi — bitta issiqxona emas, **o'nlab issiqxonalar majmuasi**
  ufqqacha (instancing bilan).
- O'zbekiston xaritasi: bajarilgan loyihalar nuqtalari "yonib" chiqadi (viloyat, maydon).
- Real bajarilgan ishlar galereyasi (foto/video), mijozlar logotiplari, sertifikatlar.
- Final: *"Sizning loyihangizni ham quramiz"* →
  **Loyiha kalkulyatori** (maydon, ekin turi, isitish turi → taxminiy narx, hosil, qoplash muddati) +
  **aloqa formasi** (ism, telefon, viloyat) → Telegram'ga.

Qo'shimcha: yengil ambient ovoz (shamol, qurilish, suv tomchisi) — **faqat foydalanuvchi yoqsa** (🔊 tugma).
Til: UZ / RU / EN almashtirgich.

---

## 3. Craft ilovalar va boshqa vositalardan foydalanish

| Ilova | Nima uchun |
|---|---|
| **Blender** | Asosiy 3D: parametrik issiqxona (Python skript bilan — o'lchamni o'zgartirsa qayta quriladi), animatsiya, kamera, bake |
| **VectorCraft** | Logotip SVG (preloader animatsiyasi uchun chiziqlarga ajratilgan), tizim ikonkalari |
| **FigCraft** | Sayt UI maketi: matn bloklari, kartochkalar, kalkulyator, forma, mobil ko'rinish |
| **PhotoCraft** | Teksturalar (tuproq, substrat, barg, metall), real loyiha fotolarini tozalash/tus berish |
| **EffectCraft** | Preloader/logotip animatsiyasi, ijtimoiy tarmoq uchun intro |
| **FilmCraft** | Blender renderlaridan promo-video (sayt fonida + Instagram/Telegram uchun) |
| **SoundCraft** | Ambient ovoz dizayni (shamol, qurilish, suv) |
| **GridCraft** | Kalkulyator formulalari (narx/hosil/qoplash) — avval jadvalda tekshiramiz |
| Gemini rasm | Konsept-art, moodboard, kerak bo'lsa tekstura variantlari |

---

## 4. Bosqichlar

1. **Ma'lumot va art-direction** — kompaniya ma'lumotlari, ranglar, moodboard, har sahna uchun storyboard
   (kamera qayerda, nima harakatlanadi, qanday matn).
2. **Vertikal kesim (eng muhim!)** — faqat 01-sahnani Blender → GLB → saytda scroll bilan to'liq ishlatamiz.
   Pipeline ishlashini va silliqligini shu yerda isbotlaymiz, keyin qolganlariga o'tamiz.
3. **Blender: qolgan sahnalar** — qoplama, tizimlar, interyer, o'simliklar o'sishi, panorama, kamera yo'li.
4. **Web: barcha sahnalar + UI** — matnlar, hisoblagichlar, kartochkalar, xarita, galereya.
5. **Polish** — post-effektlar, ovoz, preloader, mobil optimizatsiya, ishlash tezligi (60 fps maqsad).
6. **Kalkulyator + forma + deploy** — Telegram bot, Vercel, domen.

---

## 5. Sizdan kerak bo'ladigan narsalar

**Kompaniya ma'lumotlari:**
- Logotip (SVG/PNG yuqori sifat), brend ranglari
- Raqamlar: necha yil, nechta loyiha, jami maydon (ga), yillik hosil sig'imi, xodimlar soni
- Bajarilgan loyihalar: nomi, viloyati, maydoni, foto/video
- Issiqxona turlari va taxminiy narxlar (kalkulyator uchun, m² narxi oralig'i)
- Qaysi ekinlar asosiy (pomidor, bodring, qulupnay, gul...)
- Aloqa: telefon, Telegram, manzil; arizalar qaysi Telegram chatga kelsin
- Tillar: UZ / RU / EN?

**Ilovalar / sozlamalar:**
- Blender ulangan (5.2.3 LTS) ✅
- Blender MCP sozlamalarida **Poly Haven**ni yoqish (bepul HDRI osmon, tuproq/metall teksturalari)
- Ixtiyoriy: **Poly Pizza / Sketchfab** (bepul ekskavator, kran, ishchi modellari) yoki
  Tripo/Meshy generator (pullik, lekin aynan kerakli modelni yaratadi)
