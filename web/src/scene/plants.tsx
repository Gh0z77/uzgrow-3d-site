import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { chapterProgress, dripLevel, growProgress, plantProgress } from './story'
import { tex } from './materials'
import { quality } from './quality'

/**
 * 04-bob o'simliklari: Blender'dagi PlantTpl_* shablonlari ~850 nusxaga GPU instancing bilan
 * ko'paytiriladi. Ekilish, o'sish, gullash, meva tugish va pishishni vertex/fragment shader
 * boshqaradi — kadr sayin CPU'da hech narsa hisoblanmaydi.
 *
 * Joylashuv blender/ch04_build.py dagi qatorlar bilan bir xil bo'lishi kerak (Blender koordinatalari).
 */
export const PLANT_LAYOUT = {
  x0: -20,
  spanW: 8,
  spans: 5,
  rows: [1.4, 3.1, 4.9, 6.6],
  y0: -19.3,
  y1: 19.0,
  step: 0.9,
  stepMobile: 1.5, // past sifatda (telefon, kuchsiz kompyuter) ~40% kam o'simlik
  base: 0.125, // substrat mati ustki qismi
}

const KINDS = { PlantTpl_Leaves: 0, PlantTpl_Flower: 1, PlantTpl_Fruit: 2 } as const

const uniforms = {
  uPlant: { value: 0 },
  uGrow: { value: 0 },
  uTime: { value: 0 },
}

const VERT_HEAD = /* glsl */ `
  attribute float aDelay;
  attribute float aRand;
  uniform float uPlant, uGrow, uTime;
  varying float vRipen;
  varying float vCalyx;
`

// Barcha qismlar uchun umumiy o'sish: ekilganda "chiqib keladi", keyin bo'yi va eni o'sadi.
// Gul va mevalar sharsimon: normal bo'ylab markazga siqib yashiriladi (har biri o'z joyida "tugadi").
const VERT_GROW = /* glsl */ `
  #include <begin_vertex>
  float planted = smoothstep(0.0, 1.0, clamp((uPlant - aDelay * 0.7) / 0.3, 0.0, 1.0));
  float g = clamp((uGrow - aDelay * 0.12) / 0.88, 0.0, 1.0);
  float hgt = mix(0.1, 1.0, g) * planted;
  float wid = mix(0.35, 1.0, smoothstep(0.0, 0.45, g)) * planted;
  vRipen = 0.0;
  vCalyx = step(0.5, uv.x);
  #if KIND == 1
    float s = smoothstep(0.48, 0.6, g) * (1.0 - smoothstep(0.8, 0.9, g));
    transformed -= normal * 0.022 * (1.0 - s);
  #elif KIND == 2
    float s = smoothstep(0.62, 0.78, g);
    transformed -= normal * 0.0495 * (1.0 - s);
    float rs = 0.78 + position.y / 2.2 * 0.12;   // pastki shingillar oldinroq pishadi
    vRipen = smoothstep(rs, rs + 0.1, g);
  #endif
  transformed.y *= hgt;
  transformed.xz *= wid;
  transformed.x += sin(uTime * 1.1 + aRand * 6.2831 + position.y * 1.7) * 0.02 * position.y * g;
`

const FRAG_HEAD = /* glsl */ `
  varying float vRipen;
  varying float vCalyx;
`
const FRAG_COLOR = /* glsl */ `
  #include <color_fragment>
  #if KIND == 2
    diffuseColor.rgb = mix(mix(vec3(0.2, 0.42, 0.07), vec3(0.72, 0.035, 0.018), vRipen), vec3(0.1, 0.28, 0.05), vCalyx);
  #endif
`

function patch(mat: THREE.Material, kind: number) {
  mat.defines = { ...(mat.defines ?? {}), KIND: kind }
  mat.customProgramCacheKey = () => `plant-${kind}-${mat.type}`
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${VERT_HEAD}`)
      .replace('#include <begin_vertex>', VERT_GROW)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${FRAG_HEAD}`)
      .replace('#include <color_fragment>', FRAG_COLOR)
  }
}

function seeded(seed: number) {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

/** Blender (x, y, z) → three.js (x, z, -y). */
function plantSpots() {
  const L = PLANT_LAYOUT
  const rnd = seeded(42)
  const step = quality.tier === 'low' ? L.stepMobile : L.step
  const spots: { x: number; z: number; t: number; r: number; rot: number; s: number }[] = []
  for (let i = 0; i < L.spans; i++)
    for (const rx of L.rows)
      for (let y = L.y0 + step / 2; y < L.y1; y += step) {
        const t = (y - L.y0) / (L.y1 - L.y0) // eshikdan (janub) shimolga qarab ekiladi
        spots.push({ x: L.x0 + i * L.spanW + rx, z: -y, t, r: rnd(), rot: rnd() * Math.PI * 2, s: 0.88 + rnd() * 0.24 })
      }
  return spots
}

export function Plants({ scene }: { scene: THREE.Object3D }) {
  const { group, drops } = useMemo(() => {
    const spots = plantSpots()
    const group = new THREE.Group()
    group.name = 'Plants'
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const up = new THREE.Vector3(0, 1, 0)
    const delay = new Float32Array(spots.map((p) => p.t * 0.75 + p.r * 0.25))
    const rand = new Float32Array(spots.map((p) => p.r))

    for (const [name, kind] of Object.entries(KINDS)) {
      const tpl = scene.getObjectByName(name) as THREE.Mesh | undefined
      if (!tpl?.isMesh) continue
      tpl.visible = false
      const geo = tpl.geometry.clone()
      geo.setAttribute('aDelay', new THREE.InstancedBufferAttribute(delay, 1))
      geo.setAttribute('aRand', new THREE.InstancedBufferAttribute(rand, 1))

      const mat = (tpl.material as THREE.MeshStandardMaterial).clone()
      mat.side = THREE.DoubleSide
      patch(mat, kind)
      const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide })
      if (kind === 0) {
        // Barg: haqiqiy barg skanidan olingan rasm, qirralari alfa orqali
        const map = tex('/foliage/tomato_leaf.webp', true)
        map.wrapS = map.wrapT = THREE.ClampToEdgeWrapping
        mat.map = map
        mat.color.set('#eef7d8')
        mat.alphaTest = 0.45
        mat.alphaToCoverage = true
        mat.roughness = 0.62
        mat.envMapIntensity = 0.8
        depth.map = map
        depth.alphaTest = 0.45
      }
      if (kind === 2) mat.roughness = 0.24
      patch(depth, kind)

      const mesh = new THREE.InstancedMesh(geo, mat, spots.length)
      mesh.customDepthMaterial = depth
      // Barglar soyasi — barg uchburchaklarini ikki marta chizish; past sifatda tejaladi
      mesh.castShadow = kind === 0 && quality.tier !== 'low'
      mesh.userData.kind = kind
      mesh.receiveShadow = true
      mesh.frustumCulled = false
      spots.forEach((p, i) => {
        q.setFromAxisAngle(up, p.rot)
        m.compose(new THREE.Vector3(p.x, PLANT_LAYOUT.base, p.z), q, new THREE.Vector3(p.s, p.s, p.s))
        mesh.setMatrixAt(i, m)
      })
      mesh.instanceMatrix.needsUpdate = true
      group.add(mesh)
    }

    // Tomchilatib sug'orish: har bir o'simlik ildiziga tushayotgan tomchi
    const dropGeo = new THREE.BufferGeometry()
    dropGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(spots.flatMap((p) => [p.x + 0.06, PLANT_LAYOUT.base, p.z])), 3))
    dropGeo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1))
    dropGeo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1))
    // Oq plyonka ustida qo'shiluvchi (additive) tomchi ko'rinmaydi — oddiy aralashtirish, to'q ko'k
    const dropMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: uniforms.uTime, uPlant: uniforms.uPlant, uDrip: { value: 0 }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aRand;
        attribute float aDelay;
        uniform float uTime, uPlant, uDrip, uPixel;
        varying float vA;
        void main() {
          float f = fract(uTime * 0.9 + aRand * 7.0);
          vec3 p = position;
          p.y += 0.2 * (1.0 - f * f);
          float planted = step(aDelay * 0.7 + 0.3, uPlant);
          vA = uDrip * planted * smoothstep(0.0, 0.15, f) * (1.0 - smoothstep(0.85, 1.0, f));
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA *= smoothstep(1.2, 3.0, -mv.z); // kamera oldida katta xira dog' bo'lmasin
          gl_PointSize = min(0.045 * uPixel / -mv.z, 12.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.2, d) * vA;
          vec3 c = mix(vec3(0.02, 0.28, 0.85), vec3(0.75, 0.92, 1.0), smoothstep(0.25, 0.0, length(gl_PointCoord - vec2(0.38))));
          gl_FragColor = vec4(c, a * 0.9);
        }`,
    })
    const drops = new THREE.Points(dropGeo, dropMat)
    drops.frustumCulled = false
    group.add(drops)
    return { group, drops }
  }, [scene])

  useFrame((state) => {
    const p4 = chapterProgress(4)
    group.visible = p4 > 0.2 || chapterProgress(5) > 0
    if (!group.visible) return
    uniforms.uPlant.value = plantProgress()
    uniforms.uGrow.value = growProgress()
    // Meva va gullar uchburchaklarning katta qismi: hali tugmagan paytda va uzoqdan (05-bob) chizilmaydi
    const details = uniforms.uGrow.value > 0.42 && chapterProgress(5) < 0.3
    for (const c of group.children) if (c.userData.kind) c.visible = details
    uniforms.uTime.value = state.clock.elapsedTime
    const dm = drops.material as THREE.ShaderMaterial
    dm.uniforms.uDrip.value = dripLevel()
    // dunyo o'lchamini pikselga aylantiruvchi koeffitsient (perspektiva bilan)
    const cam = state.camera as THREE.PerspectiveCamera
    dm.uniforms.uPixel.value = (state.viewport.dpr * state.size.height * 0.5) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
  })

  return <primitive object={group} />
}
