import { Component, lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { initScroll } from './scroll'
import { loadState } from './loadState'
import { Overlay } from './ui/Overlay'
import { Preloader } from './ui/Preloader'
import { FloatingContact } from './ui/FloatingContact'
import { loadContent } from './i18n'

// 3D kutubxonalari va uzun matnlar alohida paketlarda: birinchi ekran ularni kutmaydi
const Stage3D = lazy(() => import('./scene/Stage3D'))
const AfterStory = lazy(() => Promise.all([import('./ui/AfterStory'), loadContent()]).then(([m]) => m))

function hasWebGL() {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/** 3D ishlamasa (eski qurilma, xato) sahifa yiqilmaydi: fon rasmi va barcha ma'lumotlar qoladi. */
class StageBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch() {
    this.props.onFail()
  }
  render() {
    return this.state.failed ? null : this.props.children
  }
}

export default function App() {
  const [no3d, setNo3d] = useState(() => !hasWebGL())

  useEffect(() => {
    initScroll()
    if (no3d) loadState.fail()
  }, [no3d])

  useEffect(() => {
    document.documentElement.classList.toggle('no-3d', no3d)
  }, [no3d])

  return (
    <>
      <div className="stage">
        {!no3d && (
          <StageBoundary
            onFail={() => {
              setNo3d(true)
            }}
          >
            <Suspense fallback={null}>
              <Stage3D />
            </Suspense>
          </StageBoundary>
        )}
      </div>
      <Overlay />
      <Preloader />
      {/* 3D hikoya uzunligi (5 bob). Undan keyin kompaniya haqidagi to'liq bo'limlar. */}
      <div className="scroll-space" />
      <Suspense fallback={<div className="after-fallback" />}>
        <AfterStory />
      </Suspense>
      <FloatingContact />
    </>
  )
}
