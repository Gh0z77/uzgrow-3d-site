// O'zbekiston chegarasini Natural Earth (world-atlas, 1:50m) dan ajratib, src/data/uzbekistan.json ga yozadi.
// Ishga tushirish: node scripts/build-map.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { feature } from 'topojson-client'

const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)))
const uz = feature(topo, topo.objects.countries).features.find((f) => f.id === '860')
if (!uz) throw new Error('Uzbekistan (860) topilmadi')
const round = (c) => (typeof c[0] === 'number' ? c.map((v) => Math.round(v * 1000) / 1000) : c.map(round))
uz.geometry.coordinates = round(uz.geometry.coordinates)
const out = { type: 'Feature', properties: { name: 'Uzbekistan', source: 'Natural Earth 1:50m via world-atlas' }, geometry: uz.geometry }
writeFileSync(new URL('../src/data/uzbekistan.json', import.meta.url), JSON.stringify(out))
console.log('ok', uz.geometry.type, JSON.stringify(out).length, 'bytes')
