/** 3D yuklanish holati: Preloader asosiy paketda (3D kutubxonasiz) turishi uchun oddiy obuna. */
type Listener = (progress: number, active: boolean, failed: boolean) => void

const state = { progress: 0, active: true, failed: false }
const listeners = new Set<Listener>()
const emit = () => listeners.forEach((l) => l(state.progress, state.active, state.failed))

export const loadState = {
  set(progress: number, active: boolean) {
    state.progress = progress
    state.active = active
    emit()
  },
  /** WebGL yo'q yoki 3D xato berdi: parda ochilsin, sayt rasm bilan ishlasin. */
  fail() {
    state.failed = true
    emit()
  },
  subscribe(fn: Listener) {
    listeners.add(fn)
    fn(state.progress, state.active, state.failed)
    return () => {
      listeners.delete(fn)
    }
  },
}
