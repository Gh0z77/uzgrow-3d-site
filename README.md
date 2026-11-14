# UZ GROW — 3D kinematik scroll sayt

Sayt bitta uzluksiz "kino": foydalanuvchi scroll qilgani sari bo'sh dalada issiqxona qad ko'taradi,
ichiga kiramiz, ko'chatlar ekiladi, o'sadi, hosil beradi. Oxirida UZ GROW qurgan majmualar panoramasi va ariza formasi chiqadi.

| Qatlam | Vosita |
|---|---|
| 3D sahna, animatsiya, kamera yo'li | Blender (Python skriptlar: `blender/`) |
| Web 3D | React Three Fiber + drei (Three.js), postprocessing |
| Scroll | GSAP ScrollTrigger + Lenis |
| Loyiha | Vite + React + TypeScript (`web/`) |
| Forma | Vercel serverless → Telegram bot (`web/api/lead.js`) |

To'liq reja: [PLAN.md](PLAN.md).

## Ishga tushirish

```bash
cd web
npm install
npm run dev
```

Forma uchun Vercel'da `TELEGRAM_BOT_TOKEN` va `TELEGRAM_CHAT_ID` o'zgaruvchilari kerak.
