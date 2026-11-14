import * as THREE from 'three'

/**
 * Blender'dan kelgan yuzlab bir xil obyekt (ferma, ustun, panel...) o'z animatsiyasini saqlaydi, lekin chizish
 * bitta InstancedMesh orqali bo'ladi: bir xil geometriya + material = bitta draw call. Asl obyektlar 31-qatlamga
 * o'tkaziladi (kamera ko'rmaydi), mixer esa ularni oddiygidek harakatlantiradi; har kadrda matritsalar nusxalanadi.
 */
type Bucket = {
  mesh: THREE.InstancedMesh
  sources: { obj: THREE.Mesh; chain: THREE.Object3D[] }[]
  always: boolean
}

const MIN_COUNT = 3

export function buildInstancer(scene: THREE.Object3D, isAlways: (name: string) => boolean) {
  const groups = new Map<string, THREE.Mesh[]>()
  scene.traverse((o) => {
    const m = o as THREE.Mesh
    if (!m.isMesh || !m.visible || Array.isArray(m.material)) return
    if (m.geometry.morphAttributes.position) return
    const key = `${m.geometry.uuid}|${m.material.uuid}`
    const list = groups.get(key)
    if (list) list.push(m)
    else groups.set(key, [m])
  })

  const group = new THREE.Group()
  group.name = 'Instanced'
  const buckets: Bucket[] = []
  for (const list of groups.values()) {
    if (list.length < MIN_COUNT) continue
    const first = list[0]
    const mesh = new THREE.InstancedMesh(first.geometry, first.material, list.length)
    mesh.castShadow = first.castShadow
    mesh.receiveShadow = first.receiveShadow
    mesh.customDepthMaterial = first.customDepthMaterial
    mesh.frustumCulled = false
    mesh.count = 0
    group.add(mesh)
    const sources = list.map((obj) => {
      const chain: THREE.Object3D[] = []
      for (let p: THREE.Object3D | null = obj; p; p = p.parent) chain.push(p)
      obj.layers.set(31)
      return { obj, chain }
    })
    buckets.push({ mesh, sources, always: list.some((m) => isAlways(m.parent?.name ?? '') || isAlways(m.name)) })
  }
  scene.add(group)

  return {
    group,
    /** changed=false bo'lsa, faqat doimiy harakatdagilar (ventilyator parraklari) yangilanadi. */
    update(changed: boolean) {
      for (const b of buckets) {
        if (!changed && !b.always) continue
        let n = 0
        for (const s of b.sources) {
          if (s.chain.some((o) => !o.visible)) continue
          s.obj.updateWorldMatrix(true, false)
          b.mesh.setMatrixAt(n++, s.obj.matrixWorld)
        }
        b.mesh.count = n
        b.mesh.instanceMatrix.needsUpdate = true
      }
    },
  }
}
