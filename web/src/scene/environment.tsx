import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import env from '../data/environment.json'
import { foliageTime, setupFoliage } from './materials'
import { quality } from './quality'

/**
 * Atrof-muhit: teraklar, qishloq daraxtlari, butalar, o't tutamlari, toshlar, uylar, elektr ustunlari.
 * Daraxt va o'tlar — haqiqiy skanlardan render qilingan impostorlar (blender/impostors.py).
 * Shablonlar Blender'da (EnvTpl_*, daraxt — Tree_0), joylashuvlarni blender/site_env.py
 * environment.json ga yozadi. Har bir shablon qismi (material) bitta InstancedMesh bo'ladi.
 */
type Spot = number[] // [x, y, burilish, masshtab, (rang indeksi)] — Blender koordinatalarida

const ROOF_COLORS = ['#3f6b5a', '#7a3b2e', '#3b5277', '#6e6e6a'].map((c) => new THREE.Color(c))
const LEAF_TINT = ['#ffffff', '#e2f0d0', '#cfe0b8', '#f2f7e6'].map((c) => new THREE.Color(c))
const GRASS_TINT = ['#ffffff', '#f3ecc6', '#e6e1a8', '#cfe2a4'].map((c) => new THREE.Color(c))

function meshesOf(root: THREE.Object3D) {
  const list: THREE.Mesh[] = []
  root.traverse((o) => (o as THREE.Mesh).isMesh && list.push(o as THREE.Mesh))
  return list
}

function instance(group: THREE.Group, tpl: THREE.Object3D | undefined, spots: Spot[], tint?: (s: Spot, matName: string) => THREE.Color | null) {
  if (!tpl) return
  const m = new THREE.Matrix4()
  const q = new THREE.Quaternion()
  const up = new THREE.Vector3(0, 1, 0)
  const p = new THREE.Vector3()
  const s = new THREE.Vector3()
  for (const src of meshesOf(tpl)) {
    const mat = src.material as THREE.MeshStandardMaterial
    const mesh = new THREE.InstancedMesh(src.geometry, mat, spots.length)
    const foliage = setupFoliage(mesh)
    spots.forEach((sp, i) => {
      q.setFromAxisAngle(up, sp[2])
      p.set(sp[0], 0, -sp[1]) // Blender (x, y) → three (x, -y)
      s.setScalar(sp[3])
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      const c = tint?.(sp, mat.name)
      if (c) mesh.setColorAt(i, c)
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    mesh.computeBoundingSphere()
    mesh.receiveShadow = !foliage
    group.add(mesh)
  }
}

export function Surroundings({ scene }: { scene: THREE.Object3D }) {
  const group = useMemo(() => {
    const group = new THREE.Group()
    group.name = 'Environment'
    // past sifatda (telefon, kuchsiz kompyuter) har ikkinchi daraxt va o't
    const thin = quality.tier === 'low'
    const pick = (list: Spot[]) => (thin ? list.filter((_, i) => i % 2 === 0) : list)

    for (const name of ['EnvTpl_Poplar', 'EnvTpl_Shrub0', 'EnvTpl_Shrub1', 'EnvTpl_Grass', 'EnvTpl_Boulder', 'EnvTpl_House', 'EnvTpl_Pole']) {
      const t = scene.getObjectByName(name)
      if (t) t.visible = false
    }
    instance(group, scene.getObjectByName('EnvTpl_Poplar'), pick(env.poplar), (sp, mat) =>
      mat === 'Foliage_Poplar' ? LEAF_TINT[Math.floor(Math.abs(sp[0] * 7 + sp[1] * 3)) % LEAF_TINT.length] : null,
    )
    instance(group, scene.getObjectByName('Tree_0'), pick(env.tree), (sp, mat) =>
      mat === 'Foliage_Tree' ? LEAF_TINT[Math.floor(Math.abs(sp[0] * 5 + sp[1])) % LEAF_TINT.length] : null,
    )
    instance(group, scene.getObjectByName('EnvTpl_House'), env.house, (sp, mat) => (mat === 'House_Roof' ? ROOF_COLORS[sp[4] ?? 0] : null))
    instance(group, scene.getObjectByName('EnvTpl_Pole'), env.pole)
    const grassTint = (sp: Spot) => GRASS_TINT[sp[4] ?? 0]
    instance(group, scene.getObjectByName('EnvTpl_Grass'), pick(env.grass), grassTint)
    instance(group, scene.getObjectByName('EnvTpl_Shrub0'), pick(env.shrub.filter((s) => s[4] === 0)), grassTint)
    instance(group, scene.getObjectByName('EnvTpl_Shrub1'), pick(env.shrub.filter((s) => s[4] === 1)), grassTint)
    instance(group, scene.getObjectByName('EnvTpl_Boulder'), env.boulder)
    return group
  }, [scene])

  useFrame((state) => {
    foliageTime.value = state.clock.elapsedTime
  })

  return <primitive object={group} />
}
