import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { weather } from './weather'
import { quality } from './quality'

/**
 * Yomg'ir va qor: kamera atrofidagi "quti" ichida aylanib turadigan zarralar. Harakat to'liq vertex shaderda,
 * CPU kadr sayin hech narsa hisoblamaydi. Issiqxona ichiga yog'maydi — u yerdan tashqaridagi yog'in ko'rinadi.
 */
const INSIDE = /* glsl */ `
  float insideHouse(vec3 p) {
    return step(abs(p.x), 20.3) * step(abs(p.z), 20.3) * step(p.y, 7.3);
  }
`

function seededBuffer(count: number, stride: number, fill: (a: Float32Array, i: number, r: () => number) => void) {
  let s = 7919
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  const a = new Float32Array(count * stride)
  for (let i = 0; i < count; i++) fill(a, i, r)
  return a
}

const BOX_RAIN = new THREE.Vector3(70, 34, 70)

function Rain() {
  const { lines, mat } = useMemo(() => {
    const n = quality.tier === 'low' ? 1500 : 3600
    const seeds = seededBuffer(n * 2, 4, (a, i, r) => {
      const k = i >> 1
      if (i % 2 === 0) {
        a[i * 4] = r()
        a[i * 4 + 1] = r()
        a[i * 4 + 2] = r()
        a[i * 4 + 3] = 0
      } else {
        a[i * 4] = a[(k * 2) * 4]
        a[i * 4 + 1] = a[(k * 2) * 4 + 1]
        a[i * 4 + 2] = a[(k * 2) * 4 + 2]
        a[i * 4 + 3] = 1
      }
    })
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 2 * 3), 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uBox: { value: BOX_RAIN }, uTint: { value: new THREE.Color('#dfe8f2') } },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime, uAmount;
        uniform vec3 uBox;
        varying float vA;
        ${INSIDE}
        void main() {
          vec3 vel = vec3(1.6, -24.0 - aSeed.y * 8.0, 0.9);
          vec3 p = aSeed.xyz * uBox + vel * uTime;
          p = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5 + cameraPosition;
          vec3 world = p - vel * 0.02 * aSeed.w;
          vec4 mv = viewMatrix * vec4(world, 1.0);
          float keep = step(fract(aSeed.x * 91.7), uAmount);
          vA = keep * uAmount * 0.17 * (1.0 - insideHouse(p)) * smoothstep(-0.2, 0.3, world.y)
            * smoothstep(40.0, 14.0, -mv.z) * smoothstep(1.5, 6.0, -mv.z) * (0.35 + 0.65 * aSeed.w);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uTint;
        varying float vA;
        void main() {
          if (vA < 0.004) discard;
          gl_FragColor = vec4(uTint, vA);
        }`,
    })
    const lines = new THREE.LineSegments(geo, mat)
    lines.frustumCulled = false
    return { lines, mat }
  }, [])

  useFrame((state) => {
    lines.visible = weather.rain > 0.01
    if (!lines.visible) return
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uAmount.value = weather.rain
  })
  return <primitive object={lines} />
}

function Snow() {
  const { points, mat } = useMemo(() => {
    const n = quality.tier === 'low' ? 1400 : 3000
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seededBuffer(n, 4, (a, i, r) => {
      a[i * 4] = r()
      a[i * 4 + 1] = r()
      a[i * 4 + 2] = r()
      a[i * 4 + 3] = r()
    }), 4))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: { value: 0 }, uAmount: { value: 0 }, uBox: { value: new THREE.Vector3(62, 30, 62) }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime, uAmount, uPixel;
        uniform vec3 uBox;
        varying float vA;
        ${INSIDE}
        void main() {
          float fall = 1.0 + aSeed.w * 1.1;
          vec3 p = aSeed.xyz * uBox + vec3(0.55, -fall, 0.2) * uTime;
          p.x += sin(uTime * 0.8 + aSeed.y * 40.0) * 0.7;
          p.z += cos(uTime * 0.6 + aSeed.x * 40.0) * 0.7;
          p = mod(p - cameraPosition + uBox * 0.5, uBox) - uBox * 0.5 + cameraPosition;
          vec4 mv = viewMatrix * vec4(p, 1.0);
          float keep = step(fract(aSeed.z * 73.1), uAmount);
          vA = keep * uAmount * (1.0 - insideHouse(p)) * smoothstep(-0.1, 0.3, p.y) * smoothstep(36.0, 14.0, -mv.z) * smoothstep(0.6, 2.6, -mv.z);
          gl_PointSize = min((0.05 + aSeed.w * 0.05) * uPixel / -mv.z, 16.0);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float a = smoothstep(0.5, 0.15, d) * vA * 0.9;
          if (a < 0.004) discard;
          gl_FragColor = vec4(vec3(1.0), a);
        }`,
    })
    const points = new THREE.Points(geo, mat)
    points.frustumCulled = false
    return { points, mat }
  }, [])

  useFrame((state) => {
    points.visible = weather.snow > 0.01
    if (!points.visible) return
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uAmount.value = weather.snow
    const cam = state.camera as THREE.PerspectiveCamera
    mat.uniforms.uPixel.value = (state.viewport.dpr * state.size.height * 0.5) / Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2)
  })
  return <primitive object={points} />
}

export function Precipitation() {
  return (
    <>
      <Rain />
      <Snow />
    </>
  )
}
