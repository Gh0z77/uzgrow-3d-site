import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { SYSTEMS, chapterProgress, dimensionsVisible, glowLevel, siteTime, systemFocus, systemInstalled, xray } from './story'
import { atmo } from './atmosphere'
import { Plants } from './plants'
import { Estate } from './estate'
import { Surroundings } from './environment'
import { patchField, patchGravel, patchGround, patchMountain } from './terrain'
import { applyMaterials, patchCladding } from './materials'
import { buildInstancer } from './instancer'
import { scroll } from '../scroll'
import { damp, range, smooth } from '../scroll'
import { useT } from '../i18n'

const URL = '/models/site.glb'
const DRACO = '/draco/'
const BLENDER_ASPECT = 16 / 9

const _pos = new THREE.Vector3()
const _quat = new THREE.Quaternion()
const _scl = new THREE.Vector3()
const _tilt = new THREE.Quaternion()
const _euler = new THREE.Euler()

const SYSTEM_BASE: Record<string, string> = { Sys_Heat: '#a6abae', Sys_Vent: '#c4cbc8', Sys_Water: '#1b1e20', Sys_Auto: '#596068' }
const CLAD_DAY = new THREE.Color('#d6eef5')
const CLAD_XRAY = new THREE.Color('#7fe6ff')
const EMIT_XRAY = new THREE.Color('#3fdcff')
const EMIT_DUSK = new THREE.Color('#ff9a45') // kechqurun o'stirish chiroqlari

/** 03-bob: tepadan ko'rinishdagi o'lchov yozuvlari (Blender'dagi Dim_Label_* nuqtalariga qo'yiladi). */
const DIM_LABELS = [
  { node: 'Dim_Label_W', key: 'width', big: false },
  { node: 'Dim_Label_L', key: 'length', big: false },
  { node: 'Dim_Label_A', key: 'area', big: true },
] as const

/**
 * Issiqxona maydoni: 01 (qurilish) va 02 (qoplama + tizimlar) boblari
 * bitta Blender timeline'i — scroll shu timeline'ni o'ynatadi.
 */
export function Site() {
  const { scene, animations, cameras } = useGLTF(URL, DRACO)
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const dimText = useT().dims

  const { mixer, action } = useMemo(() => {
    const mixer = new THREE.AnimationMixer(scene)
    return { mixer, action: mixer.clipAction(animations[0]) }
  }, [scene, animations])

  // play/stop effect ichida juft bo'lishi shart: StrictMode effektni ikki marta ishga tushiradi,
  // play() useMemo'da bo'lsa, birinchi cleanup'dagi stop() animatsiyani butunlay o'chirib qo'yadi.
  useEffect(() => {
    action.play()
    return () => {
      action.stop()
    }
  }, [action])

  const shotCam = cameras[0] as THREE.PerspectiveCamera

  // Masshtabi nolga yaqin obyektlar (hali paydo bo'lmagan yoki ketgan) umuman chizilmaydi — soya xaritasida ham
  const scaled = useMemo(() => {
    const list: THREE.Object3D[] = []
    for (const t of animations[0].tracks) {
      if (!t.name.endsWith('.scale')) continue
      const o = scene.getObjectByName(t.name.slice(0, -6))
      if (o) list.push(o)
    }
    return list
  }, [scene, animations])

  // Yorug'lik minoralari va buldozer faralari uchun real chiroqlar
  const { towers, head } = useMemo(() => {
    const towers: THREE.SpotLight[] = []
    let head: THREE.SpotLight | null = null
    scene.updateMatrixWorld(true)
    scene.traverse((o) => {
      if (!/^LightTower_\d$/.test(o.name)) return
      const light = new THREE.SpotLight('#ffd9a8', 0, 90, Math.PI / 4.2, 0.55, 1.4)
      o.getWorldPosition(light.position)
      light.position.y -= 0.4
      light.target.position.set(light.position.x * 0.1, 0, light.position.z * 0.1)
      towers.push(light)
    })
    const dozer = scene.getObjectByName('Bulldozer')
    if (dozer) {
      head = new THREE.SpotLight('#fff1d6', 0, 45, Math.PI / 6, 0.6, 1.3)
      head.position.set(1.8, 1.6, 0)
      head.target.position.set(14, -0.5, 0)
      dozer.add(head, head.target)
    }
    return { towers, head }
  }, [scene])

  // Materiallar: qoplama (X-ray), tizimlar (porlash), ventilyator parraklari
  const rig = useMemo(() => {
    let clad: THREE.MeshStandardMaterial | null = null
    const systems: (THREE.MeshStandardMaterial | null)[] = SYSTEMS.map(() => null)
    const blades: THREE.Object3D[] = []
    const edgeMat = new THREE.LineBasicMaterial({ color: '#8ff0ff', transparent: true, opacity: 0, depthWrite: false })
    const edgeCache = new Map<THREE.BufferGeometry, THREE.EdgesGeometry>()
    const cladMeshes: THREE.Mesh[] = []
    const edgeLines: THREE.LineSegments[] = []

    scene.traverse((o) => {
      if (o.name.startsWith('Fan_Blades')) blades.push(o)
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = Array.isArray(m.material) ? m.material : [m.material]
      for (const mat of mats as THREE.MeshStandardMaterial[]) {
        if (mat.name === 'Cladding') {
          clad = mat
          if (!cladMeshes.includes(m)) cladMeshes.push(m)
        }
        const si = SYSTEMS.findIndex((s) => s.mat === mat.name)
        if (si >= 0) systems[si] = mat
      }
    })

    // Qoplama panellarining chetlari — X-ray rejimida "chizma" chiziqlari
    for (const m of cladMeshes) {
      let eg = edgeCache.get(m.geometry)
      if (!eg) {
        eg = new THREE.EdgesGeometry(m.geometry, 25)
        edgeCache.set(m.geometry, eg)
      }
      const lines = new THREE.LineSegments(eg, edgeMat)
      lines.renderOrder = 3
      lines.raycast = () => {}
      m.add(lines)
      edgeLines.push(lines)
    }

    if (clad) {
      const c = clad as THREE.MeshStandardMaterial
      c.transparent = true
      c.opacity = 0.4
      c.depthWrite = false
      c.side = THREE.DoubleSide
      c.roughness = 0.12
      c.metalness = 0
      c.envMapIntensity = 1.6
      c.emissive.set('#3fdcff')
      c.emissiveIntensity = 0
      patchCladding(c)
    }
    // Oddiy holatda tizimlar haqiqiy rangida (oq quvurlar, qora sug'orish shlanglari); porlash faqat X-ray rejimida
    SYSTEMS.forEach((s, i) => systems[i]?.color.set(SYSTEM_BASE[s.mat] ?? '#c8cdd0'))
    for (const s of systems) if (s) s.emissiveIntensity = 0
    return { clad: clad as THREE.MeshStandardMaterial | null, systems, blades, edgeMat, cladMeshes, edgeLines }
  }, [scene])

  useEffect(() => {
    applyMaterials(scene)
    scene.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.MeshStandardMaterial[]
      const ground = m.name.startsWith('Ground')
      const glassy = mats.some((x) => x.name === 'Cladding')
      m.castShadow = !ground && !glassy && !m.name.startsWith('Logo') && !m.name.startsWith('Floor_')
      m.receiveShadow = !mats.some((x) => x.name.startsWith('Foliage_'))
      for (const mat of mats) {
        if (mat.name === 'Steel_Galv') mat.envMapIntensity = 1.2
        if (mat.name === 'Logo_Glow') {
          mat.fog = false // uzoqdagi logotip tuman ichida ham porlab tursin
          mat.emissiveIntensity = 7
        }
        // Skan teksturali yer, ekin qatorlari, qorli tog'lar, yaltiroq ariq suvi
        if (mat.userData.patched) continue
        mat.userData.patched = true
        if (mat.name === 'Soil') patchGround(mat)
        if (mat.name === 'Floor_Gravel') patchGravel(mat)
        if (mat.name.startsWith('Field_')) patchField(mat, mat.name)
        if (mat.name === 'Mountain') {
          patchMountain(mat)
          mat.fog = true
        }
        if (mat.name === 'Canal_Water') {
          mat.metalness = 0.4
          mat.roughness = 0.04
          mat.envMapIntensity = 1.8
        }
      }
    })
    instancer.current = buildInstancer(scene, (name) => name.startsWith('Fan_Blades'))
    return () => {
      instancer.current?.group.removeFromParent()
      instancer.current = null
    }
  }, [scene])

  const logos = useMemo(() => ['Logo', 'LogoBar'].flatMap((n) => scene.getObjectByName(n) ?? []), [scene])
  const instancer = useRef<ReturnType<typeof buildInstancer> | null>(null)
  const lastScroll = useRef(-1)
  const view = useMemo(() => ({ px: 0, py: 0, fan: 0 }), [])

  const dims = useMemo(
    () =>
      DIM_LABELS.flatMap((d) => {
        const o = scene.getObjectByName(d.node)
        return o ? [{ ...d, pos: o.getWorldPosition(new THREE.Vector3()).toArray() }] : []
      }),
    [scene],
  )
  const dimRefs = useRef<(HTMLDivElement | null)[]>([])

  useFrame((state, dt) => {
    const clip = action.getClip()
    action.time = Math.min(siteTime(), clip.duration - 1e-4)
    mixer.update(0)
    for (const o of scaled) o.visible = Math.abs(o.scale.x * o.scale.y * o.scale.z) > 0.0015

    // Blender kamerasini sahna kamerasiga ko'chiramiz
    shotCam.updateWorldMatrix(true, false)
    shotCam.matrixWorld.decompose(_pos, _quat, _scl)

    // Sichqoncha bilan juda yengil "qo'l kamerasi" effekti
    view.px = damp(view.px, state.pointer.x, 2.5, dt)
    view.py = damp(view.py, state.pointer.y, 2.5, dt)
    const t = state.clock.elapsedTime
    _euler.set(view.py * 0.018 + Math.sin(t * 0.7) * 0.0015, -view.px * 0.03 + Math.sin(t * 0.5) * 0.002, 0)
    _tilt.setFromEuler(_euler)
    camera.position.copy(_pos)
    camera.quaternion.copy(_quat).multiply(_tilt)

    // Gorizontal ko'rish burchagini saqlaymiz: telefon (portret) ekranda ham kadr qirqilmaydi
    const aspect = state.size.width / state.size.height

    // 03-bob tepadan ko'rinish: kompyuterda issiqxona o'ngda turadi (chapda parametrlar).
    // Portret ekranda matn pastda — kamerani markazga va janubga surib, issiqxonani yuqoriga chiqaramiz.
    if (aspect < 0.9) {
      const p3 = chapterProgress(3)
      const w = smooth(range(p3, 0.4, 0.47)) * (1 - smooth(range(p3, 0.74, 0.8)))
      camera.position.x += 25 * w
      camera.position.y += 14 * w
      camera.position.z += 26 * w
    }
    const vfov = THREE.MathUtils.degToRad(shotCam.fov)
    let fov = vfov
    if (aspect < BLENDER_ASPECT) {
      const hfov = 2 * Math.atan(Math.tan(vfov / 2) * BLENDER_ASPECT)
      fov = Math.min(2 * Math.atan(Math.tan(hfov / 2) / aspect), THREE.MathUtils.degToRad(78))
    }
    const fovDeg = THREE.MathUtils.radToDeg(fov)
    if (Math.abs(camera.fov - fovDeg) > 0.01) {
      camera.fov = fovDeg
      camera.updateProjectionMatrix()
    }

    // Issiqxona ichidan uzoqdagi logotip devordan "arvoh" bo'lib ko'rinmasin
    const inside = Math.abs(camera.position.x) < 21 && Math.abs(camera.position.z) < 21 && camera.position.y < 7.2
    for (const l of logos) l.visible = !inside

    const flicker = 1 + Math.sin(t * 23) * 0.01
    for (const l of towers) l.intensity = 1700 * atmo.lamps * flicker
    if (head) head.intensity = 900 * atmo.lamps

    // --- 02: X-ray va tizimlar ---
    const x = xray()
    if (rig.clad) {
      rig.clad.opacity = THREE.MathUtils.lerp(0.36, 0.06, x)
      rig.clad.color.copy(CLAD_DAY).lerp(CLAD_XRAY, x)
      const glow = glowLevel()
      rig.clad.emissive.copy(x > 0.001 ? EMIT_XRAY : EMIT_DUSK)
      rig.clad.emissiveIntensity = Math.max(0.06 * x, glow * 1.3)
    }
    // Chiziqlar faqat qoplama bosqichidan boshlab: undan oldin yig'ilgan (scale≈0) panellar arka bo'lib ko'rinib qoladi
    rig.edgeMat.opacity = 0.5 * x
    const showEdges = x > 0.002
    if (rig.edgeLines[0]?.visible !== showEdges) for (const l of rig.edgeLines) l.visible = showEdges

    const pulse = 0.5 + 0.5 * Math.sin(t * 4.5)
    rig.systems.forEach((m, i) => {
      if (!m) return
      const installed = systemInstalled(i)
      const focus = systemFocus(i)
      // o'rnatilgan tizim sokin yonib turadi, hozir hikoya qilinayotgani esa yorqin "nafas oladi"
      m.emissiveIntensity = installed * 0.4 * x + focus * x * (2.8 + 1.6 * pulse)
    })

    // Ventilyatorlar ventilyatsiya bosqichidan boshlab aylanadi (scroll tezligiga bog'liq emas)
    const fanOn = chapterProgress(2) > SYSTEMS[1].from ? 1 : 0
    view.fan = damp(view.fan, fanOn * 14, 1.5, dt)
    for (const b of rig.blades) b.rotation.z += view.fan * dt

    // Matritsalar faqat sahna qimirlaganda nusxalanadi
    const moved = scroll.current !== lastScroll.current
    lastScroll.current = scroll.current
    instancer.current?.update(moved)

    // --- 03: o'lchov yozuvlari ---
    const dv = dimensionsVisible()
    dimRefs.current.forEach((el) => {
      if (!el) return
      el.style.opacity = String(dv)
      el.style.transform = `scale(${0.85 + 0.15 * dv})`
      el.style.visibility = dv > 0.001 ? 'visible' : 'hidden'
    })
  })

  return (
    <>
      <primitive object={scene} />
      {towers.map((l) => (
        <group key={l.uuid}>
          <primitive object={l} />
          <primitive object={l.target} />
        </group>
      ))}
      <Plants scene={scene} />
      <Estate scene={scene} />
      <Surroundings scene={scene} />
      {dims.map((d, i) => (
        <Html key={d.node} position={d.pos as [number, number, number]} center zIndexRange={[1, 0]} style={{ pointerEvents: 'none' }}>
          <div
            ref={(el) => {
              dimRefs.current[i] = el
            }}
            className={`dim-label${d.big ? ' dim-label--big' : ''}`}
            style={{ opacity: 0, visibility: 'hidden' }}
          >
            <b>{dimText[d.key].text}</b>
            <span>{dimText[d.key].hint}</span>
          </div>
        </Html>
      ))}
    </>
  )
}

useGLTF.preload(URL, DRACO)
