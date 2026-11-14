import { useEffect, useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useProgress } from '@react-three/drei'
import * as THREE from 'three'

const sleep = (ms: number) => new Promise((r) => window.setTimeout(r, ms))

/**
 * Obyektlar hikoya davomida birin-ketin paydo bo'ladi. Oldindan tayyorlanmasa, har birining shaderi va teksturasi
 * aynan scroll paytida kompilyatsiya qilinib, sahifa 1-3 soniyaga qotib qoladi. Shuning uchun hammasi Preloader ortida
 * tayyorlanadi: avval teksturalar kutiladi, keyin shaderlar fonda kompilyatsiya qilinadi, keyin hamma narsa bir marta
 * ko'rinmas nishonga chiziladi (soya shaderlari va teksturalar yuklanishi uchun). Shundan keyingina kadrlar boshlanadi.
 */
export function Warmup({ onReady }: { onReady: () => void }) {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const setFrameloop = useThree((s) => s.setFrameloop)
  const started = useRef(false)

  useLayoutEffect(() => setFrameloop('never'), [setFrameloop])

  useEffect(() => {
    if (started.current) return
    started.current = true
    void (async () => {
      const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType })
      const stub = new THREE.MeshBasicMaterial()
      try {
        const t0 = performance.now()
        do await sleep(100)
        while (useProgress.getState().active && performance.now() - t0 < 15000)

        // Sahna ham EffectComposer'ning nishoniga chiziladi: shader varianti shunga bog'liq.
        gl.setRenderTarget(rt)
        // Hech qachon chizilmaydiganlar uchun ortiqcha shader kompilyatsiya qilinmasin: instancer asl obyektlari (31-qatlam)
        // va yashirin andozalar. Kadrlar hali boshlanmagani uchun boshqa hamma narsa hozir ko'rinadigan holatda.
        const sources: [THREE.Mesh, THREE.Mesh['material']][] = []
        scene.traverse((o) => {
          const m = o as THREE.Mesh
          let shown = m.layers.isEnabled(0)
          o.traverseAncestors((a) => (shown &&= a.visible))
          if (m.isMesh && !(shown && m.visible)) sources.push([m, m.material])
        })
        for (const [m] of sources) m.material = stub
        const compiling = gl.compileAsync(scene, camera)
        for (const [m, material] of sources) m.material = material
        gl.setRenderTarget(null)
        await Promise.race([compiling, sleep(25000)])

        const saved: [THREE.Object3D, boolean][] = []
        scene.traverse((o) => {
          saved.push([o, o.frustumCulled])
          o.frustumCulled = false
          const shadow = (o as THREE.DirectionalLight).shadow
          if (shadow) shadow.needsUpdate = true
        })
        gl.setRenderTarget(rt)
        gl.render(scene, camera)
        gl.setRenderTarget(null)
        for (const [o, culled] of saved) o.frustumCulled = culled
      } finally {
        gl.setRenderTarget(null)
        rt.dispose()
        stub.dispose()
        setFrameloop('always')
        // Birinchi kadr (postprocessing shaderlari) ham Preloader ortida o'tsin
        await Promise.race([new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))), sleep(400)])
        onReady()
      }
    })()
  }, [gl, scene, camera, setFrameloop, onReady])

  return null
}
