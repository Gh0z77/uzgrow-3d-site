import * as THREE from 'three'
import { weatherUniforms } from './weather'
import { lite } from './quality'

/**
 * Haqiqiy PBR teksturalar (Poly Haven, CC0; web/scripts/fetch-assets.mjs). Blender har mesh'ga metrli UV yozadi
 * (1 birlik = 1 m), shuning uchun tekstura kattaligi faqat repeat = 1 / haqiqiy o'lcham bilan belgilanadi.
 * Material qaysi tekstura olishi nomi bo'yicha aniqlanadi: GLB'da rasmlar yo'q, fayl yengil qoladi.
 */
const loader = new THREE.TextureLoader()
const cache = new Map<string, THREE.Texture>()

export function tex(path: string, srgb: boolean, size = 1) {
  const key = `${path}|${size}`
  let t = cache.get(key)
  if (!t) {
    // Telefonda yarim o'lchamli nusxa: yuklash ~4 baravar yengil
    t = loader.load(lite && path.startsWith('/textures/') ? path.replace('.webp', '-m.webp') : path)
    t.flipY = false // glTF UV'lari
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.anisotropy = 8
    t.repeat.set(1 / size, 1 / size)
    cache.set(key, t)
  }
  return t
}

type Spec = {
  tx: string
  size: number
  color?: string
  metal?: number
  rough?: number // roughnessMap ko'paytiruvchisi
  normal?: number
  diffuse?: boolean // false: faqat normal/roughness (rang materialdan yoki instansiyadan)
  plain?: boolean // xaritasiz: ingichka quvurlarda chaqnoq nuqtalar (specular aliasing) bermaydi
  boost?: number // kulrang "paint" xaritasi rangni xiralashtiradi — o'rnini to'ldiradi
}

const PAINT = 2.5
const TABLE: Record<string, Spec> = {
  Steel_Galv: { tx: 'paint', size: PAINT, color: '#a4a9ad', plain: true, metal: 0.65, rough: 0.5 },
  Machine_Yellow: { tx: 'paint', size: PAINT, color: '#ffb90f', metal: 0.15, rough: 0.7, normal: 0.45, boost: 1.7 },
  Machine_Dark: { tx: 'paint', size: PAINT, color: '#34353a', metal: 0.45, rough: 1, normal: 0.6, boost: 1.7 },
  Track_Steel: { tx: 'paint', size: 1.2, color: '#4a4540', metal: 0.7, rough: 1.1, normal: 1, boost: 1.7 },
  Unit_Dark: { tx: 'paint', size: PAINT, color: '#62686e', metal: 0.4, rough: 0.9, normal: 0.5, boost: 1.7 },
  Roller_Door: { tx: 'paint', size: PAINT, color: '#d4d7d8', metal: 0.3, rough: 0.8, normal: 0.4, boost: 1.7 },
  Fence: { tx: 'paint', size: PAINT, color: '#4f8d6c', metal: 0.3, rough: 0.8, normal: 0.5, boost: 1.7 },
  Concrete: { tx: 'concrete', size: 2.16 },
  Canal_Bank: { tx: 'concrete', size: 2.16, color: '#c9c4b8' },
  Pole_Concrete: { tx: 'concrete', size: 2.16, color: '#d8d6d0' },
  Gravel: { tx: 'gravel', size: 2, color: '#a39c90' },
  Asphalt: { tx: 'asphalt', size: 3, color: '#b9b9bc' },
  House_Wall: { tx: 'plaster', size: 2.23 },
  Packhouse_Wall: { tx: 'corrugated', size: 0.9, color: '#e4e7e6', diffuse: false, normal: 0.55, rough: 0.7, metal: 0.15 },
  Packhouse_Roof: { tx: 'corrugated', size: 1.35, color: '#2f6f55', diffuse: false, normal: 1.2, rough: 0.7, metal: 0.5 },
  House_Roof: { tx: 'corrugated', size: 1.35, diffuse: false, normal: 1.2, rough: 0.8, metal: 0.45 },
  Tank_White: { tx: 'corrugated', size: 1.35, color: '#dfe4e6', diffuse: false, normal: 1.1, rough: 0.7, metal: 0.25 },
  Slab_Bag: { tx: 'paint', size: 0.8, color: '#9ea19e', diffuse: false, normal: 0.35, rough: 0.7 },
  Coir: { tx: 'soil', size: 0.9, color: '#5a4632' },
  Boulder: { tx: 'boulder', size: 1 },
  Cement_Bag: { tx: 'cement', size: 1 },
}

function applySpec(mat: THREE.MeshStandardMaterial, s: Spec) {
  if (s.plain) {
    mat.color.set(s.color ?? '#ffffff')
    mat.metalness = s.metal ?? mat.metalness
    mat.roughness = s.rough ?? mat.roughness
    return
  }
  const base = `/textures/${s.tx}`
  if (s.diffuse !== false) mat.map = tex(`${base}_diff.webp`, true, s.size)
  mat.normalMap = tex(`${base}_nor.webp`, false, s.size)
  mat.roughnessMap = tex(`${base}_rough.webp`, false, s.size)
  const n = s.normal ?? 1
  mat.normalScale.set(n, n)
  mat.roughness = s.rough ?? 1
  mat.color.set(s.color ?? '#ffffff').multiplyScalar(s.boost ?? 1)
  if (s.metal !== undefined) mat.metalness = s.metal
  mat.needsUpdate = true
}

/** Tashqaridagi yuzalar: yomg'irda qorayadi va yaltiraydi, qorda tepaga qaragan tomoni oqaradi. */
const WEATHERED = new Set(['Asphalt', 'Gravel', 'Concrete', 'Canal_Bank', 'Packhouse_Roof', 'House_Roof', 'House_Wall', 'Machine_Yellow', 'Machine_Dark', 'Track_Steel', 'Tank_White', 'Unit_Dark', 'Boulder', 'Cement_Bag', 'Fence'])

function patchWeather(mat: THREE.MeshStandardMaterial) {
  mat.customProgramCacheKey = () => 'weathered'
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, weatherUniforms)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet, uSnowCover;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        vec3 wN = normalize(transpose(mat3(viewMatrix)) * vNormal);
        float wSnow = uSnowCover * smoothstep(0.35, 0.8, wN.y);
        diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 0.72, uWet), vec3(0.9, 0.92, 0.96), wSnow);`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        /* glsl */ `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor * mix(1.0, 0.6, uWet), 0.9, wSnow);`,
      )
  }
  mat.needsUpdate = true
}

// --- O'simlik impostorlari -----------------------------------------------------------------------

export const foliageTime = { value: 0 }

type FoliageSpec = { file: string; sway: number; height: number; up: number; billboard?: boolean; gain?: number }
const FOLIAGE: Record<string, FoliageSpec> = {
  Foliage_Tree: { file: 'tree_round', sway: 0.14, height: 7.1, up: 0.35 },
  Foliage_Poplar: { file: 'poplar', sway: 0.32, height: 16.2, up: 0.25 },
  Foliage_Shrub0: { file: 'shrub_0', sway: 0.05, height: 1.55, up: 0.6, billboard: true, gain: 1.5 },
  Foliage_Shrub1: { file: 'shrub_1', sway: 0.05, height: 1.55, up: 0.6, billboard: true, gain: 1.5 },
  Foliage_Grass: { file: 'grass', sway: 0.05, height: 0.84, up: 1.4, billboard: true, gain: 2.0 },
}

/**
 * Kesishgan tekislikni "hajmli" yoritish: normal tekislikka emas, tanadan tashqariga va yuqoriga qaraydi,
 * orqa tomonda teskari aylantirilmaydi — shunda ikki tekislik bir-biridan keskin farq qilmaydi.
 * Bir oz shamol ham qo'shiladi.
 */
function foliageNormals(geo: THREE.BufferGeometry, height: number, up: number) {
  if (geo.userData.foliageNormals) return
  geo.userData.foliageNormals = true
  const pos = geo.getAttribute('position')
  const nor = geo.getAttribute('normal') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), (pos.getY(i) / height - 0.35) * height * 0.5 + up * height, pos.getZ(i)).normalize()
    nor.setXYZ(i, v.x, v.y, v.z)
  }
  nor.needsUpdate = true
}

function patchFoliage(mat: THREE.MeshStandardMaterial, f: FoliageSpec) {
  const map = tex(`/foliage/${f.file}.webp`, true)
  map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
  mat.map = map
  mat.color.setScalar(f.gain ?? 1)
  mat.alphaTest = 0.42
  mat.alphaToCoverage = true
  mat.side = THREE.DoubleSide
  mat.roughness = 0.9
  mat.metalness = 0
  mat.envMapIntensity = 0.7
  mat.customProgramCacheKey = () => `foliage-${f.file}-${f.billboard ? 'b' : 'c'}`
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uWind = foliageTime
    Object.assign(shader.uniforms, weatherUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 fw = instanceMatrix[3].xyz;
        #else
          vec3 fw = modelMatrix[3].xyz;
        #endif
        float fh = position.y / ${f.height.toFixed(2)};
        float fs = fh * fh * ${f.sway.toFixed(3)};
        transformed.x += sin(uWind * 1.15 + fw.x * 0.31 + fw.z * 0.17) * fs;
        transformed.z += cos(uWind * 0.93 + fw.x * 0.19 + position.y * 0.3) * fs * 0.6;`,
      )
    // Past o'simliklarga kamera tepadan ham qaraydi: kesishgan tekislik "X" bo'lib ko'rinmasin deb bitta tekislik
    // kameraga buriladi (ikkinchisining eni position.x = 0 bo'lgani uchun yo'qoladi).
    if (f.billboard)
      shader.vertexShader = shader.vertexShader.replace(
        '#include <project_vertex>',
        /* glsl */ `
        #ifdef USE_INSTANCING
          float bbS = length(instanceMatrix[0].xyz);
        #else
          float bbS = 1.0;
        #endif
        vec3 bbView = normalize(cameraPosition - fw - vec3(0.0, position.y * bbS * 0.5, 0.0));
        vec3 bbRight = normalize(cross(vec3(0.0, 1.0, 0.0), bbView));
        vec3 bbUp = normalize(cross(bbView, bbRight));
        float bbFlip = sin(fw.x * 12.9 + fw.z * 7.3) > 0.0 ? 1.0 : -1.0;
        vec3 bbW = fw + bbRight * position.x * bbFlip * bbS + bbUp * position.y * bbS;
        bbW.x += sin(uWind * 1.15 + fw.x * 0.31 + fw.z * 0.17) * fs;
        vec4 mvPosition = viewMatrix * vec4(bbW, 1.0);
        gl_Position = projectionMatrix * mvPosition;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uWet, uSnowCover;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        diffuseColor.rgb = mix(diffuseColor.rgb * mix(1.0, 0.82, uWet), vec3(0.84, 0.87, 0.92), uSnowCover * 0.55);`,
      )
      .replace(
      '#include <normal_fragment_begin>',
      /* glsl */ `float faceDirection = 1.0;
      vec3 normal = normalize(vNormal);
      vec3 nonPerturbedNormal = normal;`,
    )
  }
  mat.needsUpdate = true
  return map
}

/** Soya xaritasida barg shaklini saqlaydi (to'rtburchak soya tushmasin). */
function foliageDepth(map: THREE.Texture) {
  return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.42, side: THREE.DoubleSide })
}

const depthCache = new Map<string, THREE.MeshDepthMaterial>()

/** Mesh o'simlik impostori bo'lsa, tayyorlaydi (GLB'dagi yoki instansiyalanadigan). */
export function setupFoliage(mesh: THREE.Mesh) {
  const mat = mesh.material as THREE.MeshStandardMaterial
  const f = FOLIAGE[mat.name]
  if (!f) return false
  foliageNormals(mesh.geometry, f.height, f.up)
  if (!mat.userData.foliage) {
    mat.userData.foliage = true
    const map = patchFoliage(mat, f)
    depthCache.set(mat.name, foliageDepth(map))
  }
  mesh.customDepthMaterial = depthCache.get(mat.name)
  mesh.receiveShadow = false
  return true
}

// --- Setka to'siq ---------------------------------------------------------------------------------

function chainLink() {
  const s = 128
  const c = document.createElement('canvas')
  c.width = c.height = s
  const g = c.getContext('2d')!
  g.clearRect(0, 0, s, s)
  g.strokeStyle = 'rgba(205,212,215,1)'
  g.lineWidth = 7
  g.beginPath()
  for (const [a, b, x, y] of [[0, s / 2, s / 2, 0], [s / 2, 0, s, s / 2], [s, s / 2, s / 2, s], [s / 2, s, 0, s / 2]]) {
    g.moveTo(a, b)
    g.lineTo(x, y)
  }
  g.stroke()
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.flipY = false
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  t.repeat.set(1 / 0.11, 1 / 0.11)
  return t
}

// --- Issiqxona polikarbonati ----------------------------------------------------------------------

/** Burchakka bog'liq aks (fresnel) va har 1.05 m dagi alyuminiy profillar: panelning haqiqiy chegaralari. */
export function patchCladding(mat: THREE.MeshStandardMaterial) {
  mat.customProgramCacheKey = () => 'cladding'
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, weatherUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vLN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position; vLN = normal;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLP; varying vec3 vLN;\nuniform float uWet, uSnowCover, uRainTime;')
      .replace(
        '#include <color_fragment>',
        /* glsl */ `#include <color_fragment>
        float cNdV = abs(dot(normalize(vViewPosition), normalize(vNormal)));
        float cFres = pow(clamp(1.0 - cNdV, 0.0, 1.0), 3.0);
        float cC = abs(vLN.z) > 0.7 ? vLP.x : vLP.z;
        float cF = abs(fract(cC / 1.05 + 0.5) - 0.5) * 1.05;
        float cW = fwidth(cC);
        float cBar = (1.0 - smoothstep(0.022, 0.022 + cW * 1.2, cF)) * 0.022 / (0.022 + cW * 0.35);
        cBar *= smoothstep(0.08, 0.3, opacity);
        diffuseColor.a = mix(diffuseColor.a * (0.6 + 1.5 * cFres), 0.92, cBar);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.72, 0.75, 0.78), cBar);
        // Yomg'ir: polikarbonat bo'ylab oqayotgan tomchilar. Qor: tom ustida to'planadi.
        if (uWet > 0.01) {
          float cCol = floor(cC * 26.0);
          float cH = fract(sin(cCol * 12.9898) * 43758.5453);
          float cRun = fract(vLP.y * 0.55 + uRainTime * (0.35 + cH * 0.6) + cH * 9.0);
          float cDrop = smoothstep(0.93, 1.0, cRun) * smoothstep(0.32, 0.0, abs(fract(cC * 26.0) - 0.5)) * uWet;
          diffuseColor.a = mix(diffuseColor.a, 0.75, cDrop);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.95, 1.0), cDrop);
        }
        vec3 cWN = normalize(transpose(mat3(viewMatrix)) * vNormal);
        float cSnow = uSnowCover * smoothstep(0.25, 0.75, abs(cWN.y));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.92, 0.94, 0.97), cSnow);
        diffuseColor.a = mix(diffuseColor.a, 0.9, cSnow * smoothstep(0.08, 0.3, opacity));`,
      )
  }
  mat.needsUpdate = true
}

// --- Hammasini qo'llash ---------------------------------------------------------------------------

export function applyMaterials(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh) return
    if (setupFoliage(m)) return
    const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]
    for (const mat of mats) {
      if (mat.userData.textured) continue
      mat.userData.textured = true
      const spec = TABLE[mat.name]
      if (spec) applySpec(mat, spec)
      if (WEATHERED.has(mat.name)) patchWeather(mat)
      if (mat.name === 'Fence_Mesh') {
        mat.map = chainLink()
        mat.transparent = true
        mat.depthWrite = false
        mat.side = THREE.DoubleSide
        mat.metalness = 0.5
        mat.roughness = 0.5
        mat.color.set('#ffffff')
        mat.needsUpdate = true
      }
    }
  })
}
