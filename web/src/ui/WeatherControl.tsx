import { useEffect, useState, type ReactNode } from 'react'
import { useT } from '../i18n'
import { WEATHER_OPTIONS, fromWmoCode, restoreWeather, setWeather, subscribeWeather, weather, type WeatherKind } from '../scene/weather'

const ICONS: Record<WeatherKind, ReactNode> = {
  clear: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  cloudy: <path d="M7 18h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 9.2 4.5 4.5 0 0 0 7 18Z" />,
  rain: (
    <>
      <path d="M7 14h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 5.2 4.5 4.5 0 0 0 7 14Z" />
      <path d="m8.5 17-1 3M12.5 17l-1 3M16.5 17l-1 3" />
    </>
  ),
  snow: (
    <>
      <path d="M7 13h10a4 4 0 0 0 .6-7.95A6 6 0 0 0 6.1 4.2 4.5 4.5 0 0 0 7 13Z" />
      <path d="M8 17h.01M12 16h.01M16 17h.01M10 20h.01M14 20h.01" strokeWidth="2.4" />
    </>
  ),
  fog: <path d="M4 9h13M7 13h13M4 17h13M9 5h8" />,
}

const Icon = ({ kind }: { kind: WeatherKind }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {ICONS[kind]}
  </svg>
)

// Toshkent markazi; so'rovda foydalanuvchi haqida hech qanday ma'lumot yuborilmaydi
const LIVE_URL = 'https://api.open-meteo.com/v1/forecast?latitude=41.31&longitude=69.28&current=temperature_2m,weather_code'

/** Sahnadagi ob-havoni almashtirish paneli: tanlov saqlanadi, "Toshkent" tugmasi hozirgi haqiqiy ob-havoni oladi. */
export function WeatherControl() {
  const t = useT().weather
  const [kind, setKind] = useState<WeatherKind>(weather.kind)
  const [open, setOpen] = useState(false)
  const [live, setLive] = useState<'idle' | 'loading' | 'error' | string>('idle')

  useEffect(() => {
    restoreWeather()
    setKind(weather.kind)
    return subscribeWeather(setKind)
  }, [])

  async function useLive() {
    setLive('loading')
    try {
      const res = await fetch(LIVE_URL)
      const data = await res.json()
      setWeather(fromWmoCode(data.current.weather_code))
      const t = Math.round(data.current.temperature_2m)
      setLive(`${t > 0 ? '+' : ''}${t}°`)
    } catch {
      setLive('error')
    }
  }

  return (
    <div className={`weather${open ? ' is-open' : ''}`} role="group" aria-label={t.choose}>
      <button type="button" className="weather__toggle" aria-expanded={open} aria-label={t.panel} onClick={() => setOpen(!open)}>
        <Icon kind={kind} />
      </button>
      <div className="weather__panel">
        <span className="weather__title">{t.title}</span>
        {WEATHER_OPTIONS.map((o) => (
          <button
            key={o}
            type="button"
            className={`weather__btn${kind === o ? ' is-on' : ''}`}
            aria-pressed={kind === o}
            title={t.kinds[o]}
            onClick={() => {
              setWeather(o)
              setLive('idle')
            }}
          >
            <Icon kind={o} />
            <span>{t.kinds[o]}</span>
          </button>
        ))}
        <button type="button" className="weather__live" onClick={useLive} disabled={live === 'loading'} title={t.liveHint}>
          <i />
          {live === 'loading' ? t.loading : live === 'error' ? t.failed : live === 'idle' ? t.liveNow : `${t.city} ${live}`}
        </button>
      </div>
    </div>
  )
}
