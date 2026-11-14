import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { atmo } from './atmosphere'
import { weather } from './weather'

function randomBuffer(count: number, fill: (i: number, out: Float32Array) => void, size = 3) {
  const arr = new Float32Array(count * size)
  for (let i = 0; i < count; i++) fill(i, arr)
  return arr
}

/** Tungi osmondagi yulduzlar — tong otganda so'nadi. */
export function Stars({ count = 2200 }) {
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        randomBuffer(count, (i, a) => {
          const u = Math.random() * Math.PI * 2
          const v = Math.acos(1 - Math.random() * 0.95)
          const r = 700
          a[i * 3] = r * Math.sin(v) * Math.cos(u)
          a[i * 3 + 1] = r * Math.cos(v)
          a[i * 3 + 2] = r * Math.sin(v) * Math.sin(u)
        }),
        3,
      ),
    )
    geo.setAttribute('aSeed', new THREE.BufferAttribute(randomBuffer(count, (i, a) => (a[i] = Math.random()), 1), 1))
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 1 }, uPixel: { value: 1 } },
      vertexShader: /* glsl */ `
        attribute float aSeed;
        uniform float uTime, uPixel;
        varying float vA;
        void main() {
          vA = 0.45 + 0.55 * sin(uTime * (0.6 + aSeed * 2.0) + aSeed * 40.0);
          vA *= smoothstep(0.0, 0.25, normalize(position).y);
          gl_PointSize = (0.8 + aSeed * aSeed * 2.4) * uPixel;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform float uOpacity;
        varying float vA;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(vec3(0.85, 0.9, 1.0), smoothstep(0.5, 0.0, d) * vA * uOpacity);
        }`,
    })
    return { geo, mat }
  }, [count])

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uOpacity.value = atmo.stars
    mat.uniforms.uPixel.value = state.viewport.dpr
  })

  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={-1} />
}

/** Havodagi chang zarralari — chiroq nurida yaltiraydi, kinematik chuqurlik beradi. */
export function Dust({ count = 1600 }) {
  const { geo, mat } = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(
        randomBuffer(count, (i, a) => {
          a[i * 3] = (Math.random() - 0.5) * 130
          a[i * 3 + 1] = Math.random() * 14
          a[i * 3 + 2] = (Math.random() - 0.5) * 130
        }),
        3,
      ),
    )
    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uPixel: { value: 1 }, uColor: { value: new THREE.Color('#ffd3a0') }, uLamps: { value: 1 } },
      vertexShader: /* glsl */ `
        uniform float uTime, uPixel;
        varying float vFade;
        void main() {
          vec3 p = position;
          float s = fract(sin(dot(position.xz, vec2(12.9898, 78.233))) * 43758.5453);
          p.x += sin(uTime * 0.15 + s * 30.0) * 2.0 + uTime * 0.35;
          p.z += cos(uTime * 0.12 + s * 20.0) * 2.0;
          p.y += sin(uTime * 0.3 + s * 10.0) * 0.6;
          p.x = mod(p.x + 65.0, 130.0) - 65.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vFade = smoothstep(90.0, 10.0, -mv.z) * smoothstep(2.5, 8.0, -mv.z); // kamera yonida xira dog' bo'lib qolmasin
          gl_PointSize = (14.0 + s * 26.0) * uPixel / -mv.z;
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uLamps;
        varying float vFade;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          gl_FragColor = vec4(uColor, smoothstep(0.5, 0.0, d) * vFade * (0.25 + 0.35 * uLamps));
        }`,
    })
    return { geo, mat }
  }, [count])

  useFrame((state) => {
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uPixel.value = state.viewport.dpr
    mat.uniforms.uLamps.value = atmo.lamps * (1 - Math.min(1, weather.rain + weather.snow)) - Math.min(0.7, weather.rain + weather.snow)
  })

  return <points geometry={geo} material={mat} frustumCulled={false} />
}
