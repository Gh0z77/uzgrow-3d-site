import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import Experience from './Experience'
import { SETTINGS, quality } from './quality'

/** Alohida paket: three.js va postprocessing faqat shu fayl orqali yuklanadi. */
export default function Stage3D() {
  return (
    <Canvas
      shadows
      dpr={SETTINGS[quality.tier].dpr}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: 40, near: 0.1, far: 2000, position: [-5, 1.5, 80] }}
    >
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
    </Canvas>
  )
}
