import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { chapterProgress, estateProgress, glowLevel } from './story'
import { smooth } from '../scroll'
import { patchCladding } from './materials'

/**
 * 05-bob: asosiy issiqxona atrofida butun majmua o'sib chiqadi.
 * Blender'dagi yengil proksi blok (EstateTpl_Shell + EstateTpl_Frame) instancing bilan ko'paytiriladi;
 * kechqurun bloklar ichidan o'stirish chiroqlarining to'q sariq nuri sochiladi.
 */
// Blender koordinatalarida blok markazlari (asosiy issiqxona (0,0); logotip (0,160) oldi bo'sh qoldirilgan)
const BLOCKS: [number, number][] = [
  [-110, 70], [-55, 70], [0, 70], [55, 70], [110, 70],
  [-110, 122], [-55, 122], [55, 122], [110, 122],
  [-95, 10], [95, 10],
  [-115, -60], [-60, -60], [60, -60], [115, -60],
]

const GLOW = new THREE.Color('#ffb257')

export function Estate({ scene }: { scene: THREE.Object3D }) {
  const { group, meshes, shellMat, delays } = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'Estate'
    const meshes: THREE.InstancedMesh[] = []
    let shellMat: THREE.MeshStandardMaterial | null = null
    for (const name of ['EstateTpl_Shell', 'EstateTpl_Frame']) {
      const tpl = scene.getObjectByName(name) as THREE.Mesh | undefined
      if (!tpl?.isMesh) continue
      tpl.visible = false
      const mat = (tpl.material as THREE.MeshStandardMaterial).clone()
      if (name === 'EstateTpl_Shell') {
        mat.transparent = true
        mat.opacity = 0.5
        mat.depthWrite = false
        mat.side = THREE.DoubleSide
        mat.roughness = 0.15
        mat.color.set('#9fb8c4') // kechqurun osmonni kamroq aks ettirsin — ichki nur ustun tursin
        mat.emissive.copy(GLOW)
        mat.emissiveIntensity = 0
        patchCladding(mat)
        shellMat = mat
      }
      const mesh = new THREE.InstancedMesh(tpl.geometry, mat, BLOCKS.length)
      mesh.frustumCulled = false
      meshes.push(mesh)
      group.add(mesh)
    }
    // yaqin bloklar birinchi o'sadi
    const delays = BLOCKS.map(([x, y]) => Math.min(1, (Math.hypot(x, y) - 60) / 120) * 0.65)
    return { group, meshes, shellMat: shellMat as THREE.MeshStandardMaterial | null, delays }
  }, [scene])

  const m = useMemo(() => new THREE.Matrix4(), [])
  const pos = useMemo(() => new THREE.Vector3(), [])
  const quat = useMemo(() => new THREE.Quaternion(), [])
  const scl = useMemo(() => new THREE.Vector3(), [])

  useFrame(() => {
    const p = estateProgress()
    group.visible = chapterProgress(5) > 0.05
    if (!group.visible) return
    BLOCKS.forEach(([x, y], i) => {
      const t = smooth(Math.min(1, Math.max(0, (p - delays[i]) / 0.35)))
      pos.set(x, 0, -y) // Blender (x, y) → three (x, -y)
      const on = t > 0 ? 1 : 0 // o'sishdan oldin yerda yassi "iz" qolmasin
      scl.set(on, Math.max(0.001, t) * on, on)
      m.compose(pos, quat, scl)
      for (const mesh of meshes) mesh.setMatrixAt(i, m)
    })
    for (const mesh of meshes) mesh.instanceMatrix.needsUpdate = true
    if (shellMat) {
      const g = glowLevel()
      shellMat.emissiveIntensity = g * 0.75
      shellMat.opacity = 0.5 - 0.15 * g
    }
  })

  return <primitive object={group} />
}
