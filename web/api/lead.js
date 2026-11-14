// Vercel serverless funksiyasi: saytdagi aloqa formasidan kelgan arizani Telegram chatga yuboradi.
//
// Vercel loyihasi sozlamalarida (Environment Variables) ikkita qiymat kerak:
//   TELEGRAM_BOT_TOKEN — @BotFather bergan bot tokeni
//   TELEGRAM_CHAT_ID   — arizalar keladigan chat/guruh ID si (bot o'sha guruhga qo'shilgan bo'lishi kerak)
// Tokenlar hech qachon kodga yozilmaydi.

const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]).slice(0, 1000)

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ ok: false })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}
  const name = String(body.name ?? '').trim()
  const phone = String(body.phone ?? '').trim()
  if (name.length < 2 || !/^[+0-9 ()-]{9,20}$/.test(phone)) {
    return res.status(400).json({ ok: false, error: 'invalid' })
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID
  if (!token || !chatId) {
    return res.status(500).json({ ok: false, error: 'not-configured' })
  }

  const text = [
    '<b>🌱 Yangi ariza — UZ GROW sayti</b>',
    `<b>Ism:</b> ${esc(name)}`,
    `<b>Telefon:</b> ${esc(phone)}`,
    body.email ? `<b>Email:</b> ${esc(body.email)}` : null,
    body.service ? `<b>Xizmat:</b> ${esc(body.service)}` : null,
    body.region ? `<b>Viloyat:</b> ${esc(body.region)}` : null,
    body.message ? `<b>Izoh:</b> ${esc(body.message)}` : null,
  ]
    .filter(Boolean)
    .join('\n')

  const tg = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  })
  return res.status(tg.ok ? 200 : 502).json({ ok: tg.ok })
}
