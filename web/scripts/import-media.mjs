// src/data/site-extra.ts da tilga olingan rasmlarni asosiy saytdan olib, webp qilib siqadi (katta + kichik nusxa).
//   node scripts/import-media.mjs <vaqtinchalik-papka> [asosiy-sayt-papkasi]
// Natija: public/media/<nom>.webp, <nom>-s.webp, src/data/media.json ({nom: [eni, bo'yi]})
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const TMP = process.argv[2]
if (!TMP) throw new Error('vaqtinchalik papkani bering')
const MAIN = process.argv[3] ?? 'C:/Users/ghost/Desktop/uzgrowlast-main-1'
const OUT = fileURLToPath(new URL('../public/media/', import.meta.url))
mkdirSync(OUT, { recursive: true })
mkdirSync(TMP, { recursive: true })

// Asosiy saytning jonli bazasidagi jamoa rasmlari (/api/media): repoda nusxasi yo'q
const REMOTE = {
  'team/abdulloh.jpg': 'https://uihcuwgwtshchzzgyowt.supabase.co/storage/v1/object/public/media/b7e77acf-79e5-4cfb-9744-06223efc1dea.jpg',
  'team/nafosat.jpg': 'https://uihcuwgwtshchzzgyowt.supabase.co/storage/v1/object/public/media/bc6db9de-f3f5-4c9e-835b-404e6f648383.jpg',
  'team/dilnoza.jpg': 'https://uihcuwgwtshchzzgyowt.supabase.co/storage/v1/object/public/media/45de40e5-8701-48f9-afb9-09e0b9db0c94.jpg',
  'team/sardor.jpg': 'https://uihcuwgwtshchzzgyowt.supabase.co/storage/v1/object/public/media/3f7a75f8-c355-41fa-b1b9-f60dcdc1a794.jpg',
}

const extra = readFileSync(new URL('../src/data/site-extra.ts', import.meta.url), 'utf8')
const paths = [...new Set([...extra.matchAll(/'((?:images|team)\/[^']+\.(?:jpg|png))'/g)].map((m) => m[1]))]

export const mediaName = (p) => p.replace(/^images\/(site\/)?/, '').replace(/^team\//, 'team-').replace(/\.\w+$/, '').replace(/[^\w-]+/g, '-')

async function source(p) {
  const local = join(MAIN, 'public', p)
  if (existsSync(local)) return local
  if (!REMOTE[p]) throw new Error('topilmadi: ' + p)
  const file = join(TMP, p.replace(/\W+/g, '_'))
  if (!existsSync(file)) {
    const res = await fetch(REMOTE[p])
    if (!res.ok) throw new Error(`${res.status} ${REMOTE[p]}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  }
  return file
}

const sizes = {}
let before = 0
let after = 0
for (const p of paths) {
  const file = await source(p)
  const name = mediaName(p)
  before += readFileSync(file).length
  const big = await sharp(file).rotate().resize({ width: 1500, withoutEnlargement: true }).webp({ quality: 74, effort: 5 }).toBuffer({ resolveWithObject: true })
  const small = await sharp(file).rotate().resize({ width: 640, withoutEnlargement: true }).webp({ quality: 70, effort: 5 }).toBuffer()
  writeFileSync(`${OUT}${name}.webp`, big.data)
  writeFileSync(`${OUT}${name}-s.webp`, small)
  after += big.data.length
  sizes[name] = [big.info.width, big.info.height]
}
writeFileSync(new URL('../src/data/media.json', import.meta.url), JSON.stringify(sizes))

for (const v of ['hero.mp4', 'hero-vertical.mp4']) copyFileSync(join(MAIN, 'public/videos', v), `${OUT}${v}`)
console.log(`${paths.length} ta rasm: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB (katta nusxalar)`)
