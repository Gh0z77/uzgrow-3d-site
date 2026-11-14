// Blender'da render qilingan impostor rasmlarni (blender/impostors.py) sayt uchun siqadi.
//   node scripts/pack-impostors.mjs
// Har model: 2 ta ko'rinish yonma-yon bitta webp'da, bo'sh chetlari qirqilgan.
// Natija: public/foliage/<nom>.webp, src/data/foliage.json ({w, h}: bitta tekislikning haqiqiy o'lchami, m)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const SRC = fileURLToPath(new URL('./impostor_src/', import.meta.url))
const OUT = fileURLToPath(new URL('../public/foliage/', import.meta.url))
mkdirSync(OUT, { recursive: true })
const info = JSON.parse(readFileSync(SRC + 'info.json', 'utf8'))

// Shaffof piksellar RGB'si qora bo'lsa, mipmap'da barg chetlari qorayadi — o'rtacha rang bilan to'ldiramiz
async function flattenRgb(file) {
  const { data, info: im } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  let r = 0, g = 0, b = 0, n = 0
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] > 200) {
      r += data[i]; g += data[i + 1]; b += data[i + 2]; n++
    }
  r /= n; g /= n; b /= n
  for (let i = 0; i < data.length; i += 4)
    if (data[i + 3] < 8) {
      data[i] = r; data[i + 1] = g; data[i + 2] = b
    }
  return { data, width: im.width, height: im.height }
}

function bounds({ data, width, height }, threshold = 16) {
  let halfW = 0, top = height
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++)
      if (data[(y * width + x) * 4 + 3] > threshold) {
        halfW = Math.max(halfW, Math.abs(x + 0.5 - width / 2))
        top = Math.min(top, y)
      }
  return { halfW: Math.ceil(halfW) + 2, top: Math.max(0, top - 2) }
}

const out = {}
for (const [name, q] of [['tree_round', 82], ['poplar', 82], ['shrub_0', 80], ['shrub_1', 80], ['grass', 80]]) {
  const a = await flattenRgb(`${SRC}${name}_0.png`)
  const b = await flattenRgb(`${SRC}${name}_1.png`)
  const ba = bounds(a), bb = bounds(b)
  const halfW = Math.max(ba.halfW, bb.halfW), top = Math.min(ba.top, bb.top)
  const W = a.width, H = a.height
  const cw = Math.min(W, halfW * 2), ch = H - top
  const crop = (im) =>
    sharp(im.data, { raw: { width: W, height: H, channels: 4 } })
      .extract({ left: Math.floor((W - cw) / 2), top, width: cw, height: ch })
      .png()
      .toBuffer()
  const [ca, cb] = await Promise.all([crop(a), crop(b)])
  const sheet = sharp({ create: { width: cw * 2, height: ch, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: ca, left: 0, top: 0 }, { input: cb, left: cw, top: 0 }])
  await sharp(await sheet.png().toBuffer())
    .webp({ quality: q, alphaQuality: 90, effort: 6 })
    .toFile(`${OUT}${name}.webp`)
  const m = info[name].size / W
  out[name] = { w: +(cw * m).toFixed(3), h: +(ch * m).toFixed(3) }
  console.log(name, cw * 2, ch, out[name])
}

// Pomidor bargi: bitta rasm, 512 px
const leaf = await flattenRgb(`${SRC}tomato_leaf.png`)
await sharp(leaf.data, { raw: { width: leaf.width, height: leaf.height, channels: 4 } })
  .resize(512, 512)
  .webp({ quality: 84, alphaQuality: 90, effort: 6 })
  .toFile(`${OUT}tomato_leaf.webp`)

writeFileSync(new URL('../src/data/foliage.json', import.meta.url), JSON.stringify(out, null, 2))
console.log('tayyor')
