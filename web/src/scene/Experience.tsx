import { useCallback, useEffect, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PerformanceMonitor, useProgress } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette, Noise, ToneMapping, N8AO } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import gsap from 'gsap'
import { scroll, damp } from '../scroll'
import { loadState } from '../loadState'
import { Atmosphere } from './atmosphere'
import { Site } from './Site'
import { Dust, Stars } from './particles'
import { Precipitation } from './precipitation'
import { NEXT_TIER, SETTINGS, quality } from './quality'
import { updateWeather } from './weather'
import { Warmup } from './warmup'

/** Scroll qiymatini har kadrda yumshatadi — boshqa barcha useFrame'lardan oldin ishlaydi. */
function ScrollDriver() {
  useFrame((state, dt) => {
    const prev = scroll.current
    scroll.current = damp(scroll.current, scroll.target, 3.4, Math.min(dt, 0.1))
    if (Math.abs(scroll.current - scroll.target) < 1e-5) scroll.current = scroll.target
    scroll.velocity = (scroll.current - prev) / Math.max(dt, 1e-3)
    updateWeather(dt, state.clock.elapsedTime)
  }, -10)
  return null
}

/** Faqat dev: konsoldan o'lchash uchun (window.__three.gl.info va h.k.). */
function DevHandle() {
  const state = useThree()
  if (import.meta.env.DEV) (window as unknown as { __three: typeof state }).__three = state
  return null
}

/** Yuklanish foizini sahifadagi Preloader'ga uzatadi (Preloader asosiy paketda, 3D kutubxonasiz). */
function LoadingBridge({ ready }: { ready: boolean }) {
  const { progress, active } = useProgress()
  useEffect(() => {
    // Fayllar kelgach shaderlar tayyorlanadi: parda shu tugamaguncha ochilmaydi
    loadState.set(ready ? progress : Math.min(progress, 96), active || !ready)
  }, [progress, active, ready])
  return null
}

/** Hikoya tugab oddiy bo'limlarga o'tilganda 3D umuman chizilmaydi: batareya va protsessor bo'shaydi. */
function LoopGuard() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    let paused = false
    const stage = document.querySelector<HTMLElement>('.stage')
    const check = () => {
      const past = scroll.after > window.innerHeight * 1.15
      if (past === paused) return
      paused = past
      setFrameloop(past ? 'never' : 'always')
      if (stage) stage.style.visibility = past ? 'hidden' : 'visible'
    }
    gsap.ticker.add(check)
    return () => gsap.ticker.remove(check)
  }, [setFrameloop])
  return null
}

export default function Experience() {
  const [tier, setTier] = useState(quality.tier)
  const [watch, setWatch] = useState(false)
  const [ready, setReady] = useState(false)
  const onReady = useCallback(() => setReady(true), [])
  const setDpr = useThree((s) => s.setDpr)
  const get = useThree((s) => s.get)
  const s = SETTINGS[tier]

  // Yuklanish paytidagi qotishlar sifatni tushirib yubormasin: FPS kuzatuvi sahna ochilgach boshlanadi
  useEffect(() => {
    if (!ready) return
    const id = window.setTimeout(() => setWatch(true), 3000)
    return () => window.clearTimeout(id)
  }, [ready])

  function lower() {
    // Eng past pog'onada ham sekin bo'lsa, piksellar kamayadi (0.6 gacha)
    if (quality.tier === 'low') return setDpr(Math.max(0.6, get().viewport.dpr * 0.8))
    const next = NEXT_TIER[quality.tier]
    quality.tier = next
    setDpr(SETTINGS[next].dpr)
    setTier(next)
  }

  return (
    <>
      <DevHandle />
      <LoadingBridge ready={ready} />
      {ready && <LoopGuard />}
      <ScrollDriver />
      {watch && <PerformanceMonitor bounds={(hz) => [Math.min(hz, 60) * 0.72, Math.min(hz, 60) * 0.92]} flipflops={2} onDecline={lower} />}
      <Atmosphere />
      <Stars />
      <Site />
      <Dust />
      <Precipitation />
      <EffectComposer multisampling={s.msaa}>
        {/* Ambient occlusion: fermalar, ustun taglari, o‘simliklar orasidagi yumshoq soyalar — realizmning asosiy manbai */}
        {s.ao ? <N8AO aoRadius={1.6} distanceFalloff={0.6} intensity={2.2} quality="medium" halfRes /> : <></>}
        <Bloom mipmapBlur intensity={0.85} luminanceThreshold={1.5} luminanceSmoothing={0.3} radius={0.75} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.22} darkness={0.72} />
        {s.noise ? <Noise opacity={0.045} blendFunction={BlendFunction.OVERLAY} /> : <></>}
      </EffectComposer>
      <Warmup onReady={onReady} />
    </>
  )
}
