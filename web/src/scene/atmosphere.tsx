import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { growProgress, timeOfDay, xray } from './story'
import { range, scroll, smooth } from '../scroll'
import SKY from '../data/sky.json'
import { weather } from './weather'
import { SETTINGS, lite, quality } from './quality'

/**
 * Vaqt o'tishi: tun (0) → tong (1) → ertalab (2). Hammasi bitta p dan hisoblanadi,
 * shuning uchun scroll orqaga qaytsa, osmon ham orqaga qaytadi.
 */
type Key = {
  p: number
  top: string
  hor: string
  fog: string
  sun: string
  sunI: number
  hemi: number
  env: number
  lamps: number
  stars: number
  glow: number
  density: number
}

const KEYS: Key[] = [
  { p: 0.0, top: '#02040a', hor: '#0b1324', fog: '#070b15', sun: '#7f97dc', sunI: 0.35, hemi: 0.12, env: 0.18, lamps: 1, stars: 0.5, glow: 0.0, density: 0.0052 },
  { p: 0.45, top: '#040916', hor: '#1d1a34', fog: '#100f1f', sun: '#8d9be0', sunI: 0.45, hemi: 0.16, env: 0.25, lamps: 1, stars: 0.4, glow: 0.12, density: 0.0048 },
  { p: 0.75, top: '#0c1932', hor: '#6e3e4a', fog: '#3a2f3a', sun: '#ff9358', sunI: 1.2, hemi: 0.32, env: 0.55, lamps: 0.75, stars: 0.15, glow: 0.55, density: 0.0038 },
  { p: 1.0, top: '#1c3966', hor: '#f0a068', fog: '#c4a798', sun: '#ffb47c', sunI: 3.0, hemi: 0.6, env: 1.0, lamps: 0.3, stars: 0.0, glow: 1.0, density: 0.0015 },
  { p: 1.45, top: '#2f5d99', hor: '#f3c8a0', fog: '#c8bcb6', sun: '#ffd3a6', sunI: 3.8, hemi: 0.8, env: 1.2, lamps: 0.0, stars: 0.0, glow: 0.75, density: 0.0012 },
  { p: 2.0, top: '#3a74bb', hor: '#d2dde6', fog: '#c3ccd4', sun: '#fff0dc', sunI: 4.4, hemi: 1.0, env: 1.3, lamps: 0.0, stars: 0.0, glow: 0.45, density: 0.0011 },
  { p: 3.0, top: '#2e6cc0', hor: '#c9def0', fog: '#c4d4e2', sun: '#fff6e8', sunI: 4.6, hemi: 1.05, env: 1.4, lamps: 0.0, stars: 0.0, glow: 0.3, density: 0.0009 },
  { p: 3.5, top: '#2a4f8f', hor: '#ff9a52', fog: '#dba886', sun: '#ffb377', sunI: 4.6, hemi: 1.15, env: 1.35, lamps: 0.0, stars: 0.0, glow: 1.2, density: 0.0009 },
  { p: 4.0, top: '#070d24', hor: '#6a3552', fog: '#39405e', sun: '#93a8dc', sunI: 1.5, hemi: 0.85, env: 0.85, lamps: 0.0, stars: 0.3, glow: 0.3, density: 0.0011 },
]

// X-ray ("chizma") rejimida sahna to'q ko'k tunga o'xshab qoladi — tizimlar porlab ko'rinadi.
const XRAY = { top: new THREE.Color('#06111f'), hor: new THREE.Color('#0d2840'), fog: new THREE.Color('#0a1a2b') }

// Oy (tun), quyosh (tong) va ertalabki quyosh yo'nalishlari — three.js koordinatalarida (Y yuqoriga).
const MOON_DIR = new THREE.Vector3(-0.35, 0.62, -0.7).normalize()
const SUN_DIR = new THREE.Vector3(0.66, 0.075, -0.75).normalize()
const SUN_HIGH = new THREE.Vector3(0.5, 0.55, -0.67).normalize()
const SUN_NOON = new THREE.Vector3(0.32, 0.86, -0.4).normalize()
const SUN_SET = new THREE.Vector3(-0.86, 0.06, 0.3).normalize()   // g'arbda, ufq ustida
const SUN_DUSK = new THREE.Vector3(-0.72, 0.38, 0.45).normalize() // quyosh botdi: "ko'k soat"da yorug'lik osmondan keladi

const SKY_DIR = { night: MOON_DIR, dawn: SUN_DIR, noon: SUN_NOON, sunset: SUN_SET }

const _lapse = new THREE.Vector3()
const tmpA = new THREE.Color()
const tmpB = new THREE.Color()

function sample(p: number) {
  let i = 0
  while (i < KEYS.length - 2 && p > KEYS[i + 1].p) i++
  const a = KEYS[i]
  const b = KEYS[i + 1]
  const t = THREE.MathUtils.clamp((p - a.p) / (b.p - a.p), 0, 1)
  const lerp = (x: number, y: number) => x + (y - x) * t
  const col = (x: string, y: string, out: THREE.Color) => out.copy(tmpA.set(x)).lerp(tmpB.set(y), t)
  return { a, b, t, lerp, col }
}

/** Atmosfera holati — boshqa komponentlar (chiroqlar, yulduzlar) ham o'qiydi. */
export const atmo = { lamps: 1, stars: 1, sunDir: new THREE.Vector3() }

export const skyUniforms = {
  uTop: { value: new THREE.Color() },
  uHor: { value: new THREE.Color() },
  uFogC: { value: new THREE.Color() },
  uSunColor: { value: new THREE.Color() },
  uSunDir: { value: new THREE.Vector3() },
  uGlow: { value: 0 },
  uXray: { value: 0 },
  tA: { value: null as THREE.Texture | null },
  tB: { value: null as THREE.Texture | null },
  uMix: { value: 0 },
  uYawA: { value: 0 },
  uYawB: { value: 0 },
  uGainA: { value: 1 },
  uGainB: { value: 1 },
  tOver: { value: null as THREE.Texture | null },
  uCloud: { value: 0 },
  uOverTint: { value: new THREE.Color('#ffffff') },
}

// Haqiqiy osmon suratlari (Poly Haven HDRI, ufqdan yuqori qismi). Har biri quyoshi yorug'lik yo'nalishiga to'g'ri kelsin deb
// yaw bilan buriladi — soya va osmondagi quyosh mos tushadi.
type SkyName = 'night' | 'dawn' | 'noon' | 'sunset'
const SKY_GAIN: Record<SkyName, number> = { night: 0.42, dawn: 1.15, noon: 1.2, sunset: 1.2 }
const skyTex = {} as Record<SkyName, THREE.Texture>
let skyLoaded = 0
// 4096 px osmon GPU'da ~37 MB; yengil rejimda 2048 px
const skyTail = lite ? '-m' : ''
// Keyingilari progressga kirmaydi: birinchi ekranni kutdirmasin
const lateLoader = new THREE.TextureLoader(new THREE.LoadingManager())

function skyTexture(name: string, loader: THREE.TextureLoader) {
  const t = loader.load(`/sky/${name}${skyTail}.webp`, () => skyLoaded++)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.generateMipmaps = false
  t.minFilter = THREE.LinearFilter
  return t
}

function loadSkies() {
  if (skyTex.night) return
  // Birinchi ko'rinadigani — tun: faqat shu kutiladi. Qolganlari sahifa ochilgach navbat bilan keladi.
  skyTex.night = skyTexture('night', new THREE.TextureLoader())
  skyUniforms.tOver.value = FLAT_WHITE
  window.setTimeout(() => {
    skyTex.dawn = skyTexture('dawn', lateLoader)
    window.setTimeout(() => {
      skyTex.noon = skyTexture('noon', lateLoader)
      skyTex.sunset = skyTexture('sunset', lateLoader)
    }, 1500)
  }, 800)
}

const FLAT_WHITE = new THREE.DataTexture(new Uint8Array([150, 154, 160, 255]), 1, 1)
FLAT_WHITE.needsUpdate = true
let overRequested = false

/** Hali yuklanmagan osmon so'ralsa (tez sakrash), yuklangani ko'rsatiladi. */
const anySky = (name: SkyName) => skyTex[name] ?? skyTex.dawn ?? skyTex.night
const azimuth = (d: THREE.Vector3) => Math.atan2(d.z, d.x) / (Math.PI * 2) + 0.5
const yawFor = (name: SkyName, dir: THREE.Vector3) => (skyTex[name] ? SKY[name].u : SKY.night.u) - azimuth(dir)

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`
const skyFrag = /* glsl */ `
  uniform vec3 uTop, uHor, uFogC, uSunColor, uSunDir;
  uniform float uGlow, uXray, uMix, uYawA, uYawB, uGainA, uGainB, uCloud;
  uniform vec3 uOverTint;
  uniform sampler2D tA, tB, tOver;
  varying vec3 vDir;
  vec3 photo(sampler2D t, vec3 d, float yaw) {
    float u = fract(atan(d.z, d.x) * 0.15915494 + 0.5 + yaw);
    float el = asin(clamp(d.y, -1.0, 1.0)) * 57.29578;
    float v = clamp(1.0 - (90.0 - el) / 100.8, 0.002, 0.998);
    return texture2D(t, vec2(u, v)).rgb;
  }
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 a = photo(tA, d, uYawA) * uGainA;
    vec3 col = a;
    if (uMix > 0.001) col = mix(a, photo(tB, d, uYawB) * uGainB, uMix);
    // X-ray "chizma" rejimi: osmon to'q ko'k gradientga o'tadi
    vec3 grad = mix(uHor, uTop, smoothstep(-0.02, 0.5, h));
    // Bulutli osmon: alohida surat, rangi kun vaqtidan olinadi
    if (uCloud > 0.002) {
      // Surat yorug'ligi va rangi tenglashtiriladi: ko'k osmon emas, bir tekis bulut qatlami
      vec3 o = photo(tOver, d, 0.0);
      float ol = dot(o, vec3(0.2126, 0.7152, 0.0722));
      o = mix(vec3(ol), o, 0.3) * (1.9 - ol * 1.4);
      col = mix(col, o * uOverTint, uCloud);
    }
    // Surat ACES ichida rangini yo'qotmasin: kontrast va to'yinganlik
    float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
    col = max(mix(vec3(lum), col, 1.28), vec3(0.0));
    col = pow(col, vec3(1.18)) * 1.22;
    col = mix(col, grad, uXray);
    float s = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(s, 40.0) * 0.12 + pow(s, 900.0) * 1.2) * uGlow * (1.0 - uXray) * (1.0 - uCloud) * smoothstep(-0.03, 0.01, uSunDir.y);
    // Ufq: suratdagi yer ko'rinmasin, tog'lar tumani bilan bir xil rangga erisin
    col = mix(uFogC, col, smoothstep(-0.005, 0.075, h));
    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`

function skyMaterial() {
  loadSkies()
  return new THREE.ShaderMaterial({
    uniforms: skyUniforms,
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  })
}

/**
 * Aks va yumshoq yorug'lik shu osmondan olinadi. Har kadrda emas (bu qimmat), faqat kun vaqti yoki X-ray
 * sezilarli o'zgarganda qayta hisoblanadi.
 */
function SkyEnvironment() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const rig = useMemo(() => {
    const skyScene = new THREE.Scene()
    const dome = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMaterial())
    dome.frustumCulled = false
    skyScene.add(dome)
    return { skyScene, pmrem: new THREE.PMREMGenerator(gl), rt: null as THREE.WebGLRenderTarget | null, p: -9, x: -9, cloud: -9, loaded: -1, at: -9 }
  }, [gl])

  const bake = () => {
    const next = rig.pmrem.fromScene(rig.skyScene, 0, 0.1, 100, { size: 128 })
    scene.environment = next.texture
    rig.rt?.dispose()
    rig.rt = next
  }

  // Shaderlar oldindan tayyorlanishi uchun environment birinchi kadrdan oldin bo'lishi kerak (warmup.tsx)
  useEffect(() => {
    if (!rig.rt) bake()
  })

  useFrame((state) => {
    const p = timeOfDay()
    const x = xray()
    const t = state.clock.elapsedTime
    const changed = Math.abs(p - rig.p) > 0.012 || Math.abs(x - rig.x) > 0.03 || Math.abs(weather.cloud - rig.cloud) > 0.03 || rig.loaded !== skyLoaded
    if (!changed || (t - rig.at < (lite ? 1 : 0.3) && rig.rt)) return
    rig.p = p
    rig.x = x
    rig.cloud = weather.cloud
    // Kelgan osmon surati darhol GPU'ga: kun vaqti o'zgarganda birinchi ishlatilishda qotmasin
    if (rig.loaded !== skyLoaded) for (const tex of Object.values(skyTex)) if (tex.image) gl.initTexture(tex)
    rig.loaded = skyLoaded
    rig.at = t
    bake()
  })
  return null
}

function SkyDome({ radius = 900 }: { radius?: number }) {
  const mat = useMemo(skyMaterial, [])
  return (
    <mesh material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[radius, 48, 24]} />
    </mesh>
  )
}

const shadowState = { scroll: -1, warm: 0 }

export function Atmosphere() {
  const scene = useThree((s) => s.scene)
  const sun = useRef<THREE.DirectionalLight>(null!)
  const hemi = useRef<THREE.HemisphereLight>(null!)
  const fog = useMemo(() => new THREE.FogExp2('#070b15', 0.011), [])
  const target = useMemo(() => new THREE.Object3D(), [])

  useFrame(() => {
    const p = timeOfDay()
    const x = xray()
    const s = sample(p)
    s.col(s.a.top, s.b.top, skyUniforms.uTop.value).lerp(XRAY.top, x * 0.85)
    s.col(s.a.hor, s.b.hor, skyUniforms.uHor.value).lerp(XRAY.hor, x * 0.85)
    s.col(s.a.sun, s.b.sun, skyUniforms.uSunColor.value)
    s.col(s.a.fog, s.b.fog, fog.color).lerp(XRAY.fog, x * 0.85)
    fog.density = s.lerp(s.a.density, s.b.density)
    skyUniforms.uGlow.value = s.lerp(s.a.glow, s.b.glow) * (1 - 0.8 * x)

    // Ob-havo: bulutli osmon rangi tumandan (kun vaqtidan) olinadi, keyin tuman quyuqlashadi va kulranglashadi
    const w = weather
    skyUniforms.uCloud.value = w.cloud * (1 - x)
    // Bulutli osmon deyarli kulrang va tog'lardan yorug'roq: ko'k osmon yomg'ir bilan birga ko'rinmasin
    const fogLum = fog.color.r * 0.3 + fog.color.g * 0.55 + fog.color.b * 0.15
    skyUniforms.uOverTint.value.copy(fog.color).lerp(tmpB.setRGB(fogLum, fogLum, fogLum), 0.75).multiplyScalar(2.3 * (1 - 0.35 * w.rain))
    if (w.kind !== 'clear' && !overRequested) {
      overRequested = true
      skyUniforms.tOver.value = skyTexture('overcast', lateLoader)
    }
    fog.density = Math.max(fog.density * (1 + 0.5 * w.cloud), 0.0011 * w.cloud) + 0.0072 * w.fog
    const gray = fog.color.r * 0.3 + fog.color.g * 0.55 + fog.color.b * 0.15
    tmpA.setRGB(gray, gray * 1.01, gray * 1.03)
    fog.color.lerp(tmpA, 0.7 * w.cloud).multiplyScalar(1 - 0.3 * w.rain)

    // Oy → tong quyoshi (p 0.5..1) → ertalab quyosh ko'tariladi (p 1..2)
    const k = THREE.MathUtils.smoothstep(p, 0.5, 1.0)
    atmo.sunDir.copy(MOON_DIR).lerp(SUN_DIR, k)
    atmo.sunDir.lerp(SUN_HIGH, THREE.MathUtils.smoothstep(p, 1.0, 2.0))
    atmo.sunDir.lerp(SUN_NOON, THREE.MathUtils.smoothstep(p, 2.0, 3.0))
    atmo.sunDir.lerp(SUN_SET, THREE.MathUtils.smoothstep(p, 3.0, 3.5))
    atmo.sunDir.lerp(SUN_DUSK, THREE.MathUtils.smoothstep(p, 3.5, 4.0)).normalize()

    // 04-bob time-lapse: o'sish davomida quyosh osmonda ikki marta aylanadi — soyalar polda yuguradi
    const tl = growProgress()
    const lw = smooth(range(tl, 0, 0.06)) * (1 - smooth(range(tl, 0.94, 1)))
    if (lw > 0) {
      const az = tl * Math.PI * 4
      const el = 0.4 + 0.45 * Math.abs(Math.sin(tl * Math.PI * 2))
      _lapse.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el))
      atmo.sunDir.lerp(_lapse, lw).normalize()
    }
    skyUniforms.uSunDir.value.copy(atmo.sunDir)
    skyUniforms.uFogC.value.copy(fog.color)
    skyUniforms.uXray.value = x * 0.85

    // Qaysi suratlar orasida aralashamiz: tun → tong → kunduz → quyosh botishi → yana tun
    let na: SkyName = 'night'
    let nb: SkyName = 'night'
    let mix = 0
    if (p >= 0.55 && p < 1.0) {
      nb = 'dawn'
      mix = smooth(range(p, 0.55, 1.0))
    } else if (p >= 1.0 && p < 1.8) {
      na = 'dawn'
      nb = 'noon'
      mix = smooth(range(p, 1.0, 1.8))
    } else if (p >= 1.8 && p < 3.0) {
      na = nb = 'noon'
    } else if (p >= 3.0 && p < 3.5) {
      na = 'noon'
      nb = 'sunset'
      mix = smooth(range(p, 3.0, 3.5))
    } else if (p >= 3.5) {
      na = 'sunset'
      mix = 0.62 * smooth(range(p, 3.5, 4.0)) // oxirida to'liq tun emas — alacakorong'i, osmon ko'rinib tursin
    }
    skyUniforms.tA.value = anySky(na)
    skyUniforms.tB.value = anySky(nb)
    skyUniforms.uMix.value = mix
    skyUniforms.uGainA.value = SKY_GAIN[na]
    skyUniforms.uGainB.value = SKY_GAIN[nb]
    // 04-bob time-lapse: bulutlar ham aylanadi
    const spin = lw * tl * 1.5
    skyUniforms.uYawA.value = yawFor(na, SKY_DIR[na]) + (na === 'noon' ? spin : 0)
    skyUniforms.uYawB.value = yawFor(nb, SKY_DIR[nb]) + (nb === 'noon' ? spin : 0)

    // Soya xaritasi faqat sahna o'zgarganda (scroll yoki quyosh) qayta chiziladi
    const light = sun.current
    light.shadow.autoUpdate = false
    shadowState.warm++
    // Scroll paytida har ikkinchi kadrda: soya bir kadr kechikishi ko'rinmaydi, soya o'tishi esa ikki baravar kam
    if ((scroll.current !== shadowState.scroll && shadowState.warm % (lite ? 3 : 2) === 0) || shadowState.warm < 180) {
      light.shadow.needsUpdate = true
      shadowState.scroll = scroll.current
    }

    sun.current.position.copy(atmo.sunDir).multiplyScalar(140)
    sun.current.color.copy(skyUniforms.uSunColor.value).lerp(tmpB.set('#ffffff'), 0.55 * w.cloud)
    sun.current.intensity = s.lerp(s.a.sunI, s.b.sunI) * (1 - 0.72 * x) * (1 - 0.86 * w.cloud)
    hemi.current.intensity = s.lerp(s.a.hemi, s.b.hemi) * (1 - 0.55 * x) * (1 + 0.15 * w.cloud)
    hemi.current.color.copy(skyUniforms.uTop.value).lerp(skyUniforms.uHor.value, 0.5)
    scene.environmentIntensity = s.lerp(s.a.env, s.b.env) * (1 - 0.5 * x)

    atmo.lamps = s.lerp(s.a.lamps, s.b.lamps)
    atmo.stars = s.lerp(s.a.stars, s.b.stars) * (1 - w.cloud)
  })

  return (
    <>
      <primitive object={fog} attach="fog" />
      <SkyDome />
      <SkyEnvironment />
      <primitive object={target} />
      <directionalLight
        ref={sun}
        target={target}
        castShadow
        shadow-mapSize={[SETTINGS[quality.tier].shadow, SETTINGS[quality.tier].shadow]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.03}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-near={10}
        shadow-camera-far={320}
      />
      <hemisphereLight ref={hemi} groundColor="#1a120c" />
    </>
  )
}
