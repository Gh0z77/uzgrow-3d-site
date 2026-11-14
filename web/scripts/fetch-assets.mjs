// Poly Haven'dan (CC0) real teksturalar va osmonlarni yuklab, sayt uchun siqadi.
//   node scripts/fetch-assets.mjs <yuklash-papkasi>
// Natija: public/textures/<nom>_{diff,nor,rough}.webp, public/sky/<nom>.webp, src/data/sky.json
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const DL = process.argv[2]
if (!DL) throw new Error('yuklash papkasini bering')
mkdirSync(DL, { recursive: true })
const OUT_T = new URL('../public/textures/', import.meta.url)
const OUT_S = new URL('../public/sky/', import.meta.url)
mkdirSync(OUT_T, { recursive: true })
mkdirSync(OUT_S, { recursive: true })

// nom: [Poly Haven id, o'lcham (px), kulrang qilinsinmi, faqat diffuse]
const TEXTURES = {
  soil: ['dry_mud_field_001', 1024],
  furrows: ['farm_furrows', 1024],
  grass: ['sparse_grass', 1024],
  gravel: ['gravel_floor_02', 1024],
  asphalt: ['asphalt_02', 1024],
  concrete: ['concrete_wall_007', 1024],
  plaster: ['plastered_wall_02', 1024],
  corrugated: ['corrugated_iron_02', 1024],
  paint: ['blue_metal_plate', 1024, true], // kulrang: saytda sariq, kulrang po'lat va h.k. ga bo'yaladi
  macro_grass: ['rocky_terrain_02', 2048, false, true], // 90 m aerial — uzoqdan yer
  macro_dirt: ['dirt_aerial_02', 1024, false, true], // 20 m aerial
}
// Skan qilingan modellarning teksturalari (geometriya blender/assets_lib.blend da)
const MODEL_TEXTURES = { boulder: 'boulder_01', cement: 'cement_bag' }
// Kun vaqti bo'yicha osmonlar
// "puresky": faqat osmon, ufqda daraxt yoki bino yo'q — sahnaning o'z tog'lari bilan aralashmaydi
const SKIES = { night: 'rogland_clear_night', dawn: 'qwantani_dawn_puresky', noon: 'kloofendal_48d_partly_cloudy_puresky', sunset: 'qwantani_sunset_puresky', overcast: 'kloofendal_overcast_puresky' }

async function download(url, file) {
  if (existsSync(file)) return file
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status} ${url}`)
  writeFileSync(file, Buffer.from(await res.arrayBuffer()))
  return file
}

for (const [name, [id, size, gray, diffOnly]] of Object.entries(TEXTURES)) {
  const res = size >= 2048 ? '2k' : '1k'
  const base = `https://dl.polyhaven.org/file/ph-assets/Textures/jpg/${res}/${id}/${id}`
  for (const [suffix, key, q] of [['diff', 'diff', 80], ['nor_gl', 'nor', 78], ['rough', 'rough', 70]]) {
    if (diffOnly && key !== 'diff') continue
    const src = await download(`${base}_${suffix}_${res}.jpg`, join(DL, `${id}_${suffix}.jpg`))
    let img = sharp(src).resize(size, size)
    if (gray && key === 'diff') img = img.grayscale().normalise()
    await img.clone().webp({ quality: q, effort: 5 }).toFile(fileURLToPath(new URL(`${name}_${key}.webp`, OUT_T)))
    await img.clone().resize(size / 2, size / 2).webp({ quality: q - 6, effort: 5 }).toFile(fileURLToPath(new URL(`${name}_${key}-m.webp`, OUT_T)))
  }
  console.log('tekstura', name, id)
}

for (const [name, id] of Object.entries(MODEL_TEXTURES)) {
  for (const [suffix, key, q] of [['diff', 'diff', 80], ['nor_gl', 'nor', 78], ['rough', 'rough', 70]]) {
    const src = await download(`https://dl.polyhaven.org/file/ph-assets/Models/jpg/1k/${id}/${id}_${suffix}_1k.jpg`, join(DL, `${id}_${suffix}.jpg`))
    await sharp(src).resize(1024, 1024).webp({ quality: q, effort: 5 }).toFile(fileURLToPath(new URL(`${name}_${key}.webp`, OUT_T)))
    await sharp(src).resize(512, 512).webp({ quality: q - 6, effort: 5 }).toFile(fileURLToPath(new URL(`${name}_${key}-m.webp`, OUT_T)))
  }
  console.log('model teksturasi', name, id)
}

const skyInfo = {}
for (const [name, id] of Object.entries(SKIES)) {
  const src = await download(`https://dl.polyhaven.org/file/ph-assets/HDRIs/extra/Tonemapped%20JPG/${id}.jpg`, join(DL, `sky_${id}.jpg`))
  const meta = await sharp(src).metadata()
  // Quyosh/oy joyini topamiz: eng yorqin dog'ning markazi (faqat ufqdan yuqori qism)
  const W = 1024, H = 512
  const { data } = await sharp(src).resize(W, H).grayscale().blur(2).raw().toBuffer({ resolveWithObject: true })
  let max = 0
  for (let y = 0; y < H / 2; y++) for (let x = 0; x < W; x++) max = Math.max(max, data[y * W + x])
  let sx = 0, sy = 0, sn = 0, sc = 0, ss = 0
  for (let y = 0; y < H / 2; y++)
    for (let x = 0; x < W; x++)
      if (data[y * W + x] >= max * 0.97) {
        const a = (x / W) * Math.PI * 2
        sc += Math.cos(a); ss += Math.sin(a); sy += y; sn++
      }
  sx = ((Math.atan2(ss, sc) / (Math.PI * 2) + 1) % 1)
  skyInfo[name] = { id, u: +sx.toFixed(4), elevation: +((0.5 - sy / sn / H) * 180).toFixed(2), peak: max }
  // Faqat yuqori qismi (ufqdan sal pastgacha): pastini baribir yer yopadi
  const cropH = Math.round(meta.height * 0.56)
  // Kompyuter: 4096 (GPU'da ~19 MB), telefon: 2048
  for (const [w, tail] of [[4096, ''], [2048, '-m']]) {
    await sharp(src)
      .extract({ left: 0, top: 0, width: meta.width, height: cropH })
      .resize(w, Math.round((w * cropH) / meta.width))
      .webp({ quality: 82, effort: 5 })
      .toFile(fileURLToPath(new URL(`${name}${tail}.webp`, OUT_S)))
  }
  console.log('osmon', name, id, skyInfo[name])
}
writeFileSync(new URL('../src/data/sky.json', import.meta.url), JSON.stringify(skyInfo, null, 2))
console.log('tayyor')
