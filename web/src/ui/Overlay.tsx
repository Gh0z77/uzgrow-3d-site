import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { scroll, range, smooth, scrollTo } from '../scroll'
import { CHAPTERS, SYSTEMS, at, systemFocus, systemInstalled } from '../scene/story'
import { POWER } from '../data/company'
import { CATALOG_URL, NAV_GROUPS } from '../data/site-extra'
import { formatNumber, getLang, useT } from '../i18n'
import { LangSwitch } from './LangSwitch'
import { WeatherControl } from './WeatherControl'

/**
 * 3D sahna — vizual metafora (noldan qurish → muhandislik → tayyor majmua → hosil → katta majmua),
 * yozuvlar esa UZ GROW kompaniyasi haqida (matnlar i18n/{uz,ru,en}.ts da, manba — www.uzgrow.uz).
 * Yozuvlar 3D bilan bir xil yumshatilgan scroll qiymatiga bog'langan; at(bob, p) bob ichidagi progressni
 * global scroll'ga aylantiradi.
 */
type Caption = { id: string; from: number; to: number }

const CAPTIONS: Caption[] = [
  { id: 'hero', from: -1, to: at(1, 0.12) },
  { id: 'since', from: at(1, 0.15), to: at(1, 0.37) },
  { id: 'mission', from: at(1, 0.38), to: at(1, 0.5) },
  { id: 'vision', from: at(1, 0.52), to: at(1, 0.7) },
  { id: 'values', from: at(1, 0.72), to: at(1, 0.9) },
  { id: 'about', from: at(1, 0.93), to: at(2, 0.07) },
  { id: 'services', from: at(2, 0.09), to: at(2, 0.29) },
  { id: 'equipment', from: at(2, 0.31), to: at(2, 0.91) },
  { id: 'team', from: at(2, 0.93), to: at(3, 0.05) },
  { id: 'turnkey', from: at(3, 0.07), to: at(3, 0.34) },
  { id: 'consulting', from: at(3, 0.38), to: at(3, 0.62) },
  { id: 'types', from: at(3, 0.65), to: at(3, 0.84) },
  { id: 'open', from: at(3, 0.87), to: at(4, 0.04) },
  { id: 'leaders', from: at(4, 0.05), to: at(4, 0.25) },
  { id: 'founder', from: at(4, 0.27), to: at(4, 0.42) },
  { id: 'crops', from: at(4, 0.44), to: at(4, 0.56) },
  { id: 'presidential', from: at(4, 0.58), to: at(4, 0.91) },
  { id: 'result', from: at(4, 0.93), to: at(5, 0.04) },
  { id: 'intl', from: at(5, 0.06), to: at(5, 0.3) },
  { id: 'power', from: at(5, 0.34), to: at(5, 0.68) },
  { id: 'final', from: at(5, 0.72), to: 1.0 },
]

type Stat = { value: number; suffix?: string; label: string }

/** Raqamlar global scroll'ning [a, b] oralig'ida 0 dan sanab chiqadi. Til almashganda bu tugunlar saqlanishi kerak. */
function StatGrid({ items, a, b }: { items: Stat[]; a: number; b: number }) {
  return (
    <div className="stats">
      {items.map((s) => (
        <div key={s.value} className="stat">
          <strong>
            <span data-count={s.value} data-a={a} data-b={b}>
              0
            </span>
            {s.suffix}
          </strong>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

/** Ikki qatorli sarlavha: oxirgi qator urg'uli bo'lishi mumkin. */
function Lines({ lines, accent }: { lines: string[]; accent?: boolean }) {
  return (
    <>
      {lines[0]}
      <br />
      {accent ? <em>{lines[1]}</em> : lines[1]}
    </>
  )
}

function Next({ title, sub }: { title: string; sub: string }) {
  const label = useT().story.nextChapter
  return (
    <div className="next">
      <span>{label}</span>
      <b>{title}</b>
      <small>{sub}</small>
    </div>
  )
}

const FADE = 0.012

export function Overlay() {
  const root = useRef<HTMLDivElement>(null)
  const t = useT()
  const st = t.story
  const [menu, setMenu] = useState(false)
  const go = (href: string) => (e: { preventDefault: () => void }) => {
    e.preventDefault()
    setMenu(false)
    scrollTo(href)
  }

  useEffect(() => {
    const el = root.current!
    const caps = CAPTIONS.map((c) => ({ ...c, node: el.querySelector<HTMLElement>(`[data-cap="${c.id}"]`)! }))
    const nums = [...el.querySelectorAll<HTMLElement>('[data-count]')]
    const fill = el.querySelector<HTMLElement>('.rail__fill')!
    const hint = el.querySelector<HTMLElement>('.scroll-hint')!
    const rail = el.querySelector<HTMLElement>('.rail')!
    const topbar = el.querySelector<HTMLElement>('.topbar')!
    const chapterDots = [...el.querySelectorAll<HTMLElement>('.rail__item')]
    const sysRows = [...el.querySelectorAll<HTMLElement>('.sys')]

    const shownE = new Map<HTMLElement, number>()
    const weatherEl = el.querySelector<HTMLElement>('.weather')!
    let lastS = -1
    let lastAfter = -1
    let lastLang = getLang()

    const tick = () => {
      const s = scroll.current
      // Hech narsa o'zgarmagan bo'lsa DOM'ga tegmaymiz: bu oddiy holatda kadr vaqtini tejaydi
      if (s === lastS && scroll.after === lastAfter && getLang() === lastLang) return
      lastS = s
      lastAfter = scroll.after
      lastLang = getLang()
      // Pastdagi bo'limlarga tez sakralganda (yumshatilgan qiymat hali quvib yetmagan) yozuvlar ularning ustiga chiqmasin
      const storyOn = 1 - range(scroll.after, 0, 160)
      for (const c of caps) {
        const vis = Math.min(range(s, c.from, c.from + FADE), 1 - range(s, c.to - FADE, c.to))
        const e = smooth(vis) * storyOn
        if (shownE.get(c.node) === e) continue
        shownE.set(c.node, e)
        c.node.style.opacity = String(e)
        c.node.style.transform = `translate3d(0, ${(1 - e) * 28}px, 0)`
        c.node.style.visibility = e > 0.001 ? 'visible' : 'hidden'
      }
      for (const n of nums) {
        const v = Number(n.dataset.count) * smooth(range(s, Number(n.dataset.a), Number(n.dataset.b)))
        const text = formatNumber(Math.round(v))
        if (n.textContent !== text) n.textContent = text
      }
      sysRows.forEach((row, i) => {
        row.classList.toggle('is-active', systemFocus(i) > 0.5)
        row.style.setProperty('--installed', String(0.35 + 0.65 * systemInstalled(i)))
      })
      fill.style.transform = `scaleY(${s})`
      hint.style.opacity = String(1 - range(s, 0.0, 0.015))
      rail.style.opacity = String(1 - range(scroll.after, 0, 300)) // hikoyadan keyin bob relsi kerak emas
      topbar.classList.toggle('is-solid', scroll.after > 200)
      weatherEl.classList.toggle('is-hidden', scroll.after > 60)
      el.classList.toggle('overlay--past', scroll.after > 160)
      chapterDots.forEach((d, i) => {
        const c = CHAPTERS[i]
        const on = c.to > c.from && s >= c.from && (s < c.to || c.to === 1)
        d.classList.toggle('is-active', on)
      })
    }
    gsap.ticker.add(tick)
    return () => gsap.ticker.remove(tick)
  }, [])

  return (
    <div className="overlay" ref={root}>
      <header className="topbar">
        <a className="brand" href="#" onClick={(e) => (e.preventDefault(), scrollTo(0))}>
          <img src="/images/logo.png" alt="UZ GROW" width={97} height={40} />
        </a>
        <nav className="mainnav" aria-label={t.nav.label}>
          {NAV_GROUPS.map((g) => (
            <div key={g.key} className="mainnav__group">
              <button type="button" aria-haspopup="true">
                {t.nav.groups[g.key]}
                <svg viewBox="0 0 10 6" width="9" height="6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                  <path d="m1 1 4 4 4-4" />
                </svg>
              </button>
              <div className="mainnav__drop">
                {g.items.map((href) => (
                  <a key={href} href={href} onClick={go(href)}>
                    {t.nav.links[href]}
                  </a>
                ))}
              </div>
            </div>
          ))}
          <a className="mainnav__link" href="#aloqa" onClick={go('#aloqa')}>
            {t.nav.contact}
          </a>
        </nav>
        <div className="topbar__right">
          <LangSwitch className="langs--bar" />
          <a className="topbar__catalog" href={CATALOG_URL} target="_blank" rel="noreferrer">
            {t.nav.catalog}
          </a>
          <a className="btn btn--ghost" href="#hisob" onClick={go('#hisob')}>
            {t.nav.estimate}
          </a>
          <button type="button" className="burger" aria-label={menu ? t.nav.closeMenu : t.nav.openMenu} aria-expanded={menu} onClick={() => setMenu(!menu)}>
            <i />
            <i />
          </button>
        </div>
      </header>

      <div className={`sheetnav${menu ? ' is-open' : ''}`} aria-hidden={!menu}>
        <div>
          <p>{t.common.language}</p>
          <LangSwitch className="langs--sheet" hidden={!menu} />
        </div>
        {NAV_GROUPS.map((g) => (
          <div key={g.key}>
            <p>{t.nav.groups[g.key]}</p>
            {g.items.map((href) => (
              <a key={href} href={href} tabIndex={menu ? 0 : -1} onClick={go(href)}>
                {t.nav.links[href]}
              </a>
            ))}
          </div>
        ))}
        <div>
          <p>{t.nav.reach}</p>
          <a href="#aloqa" tabIndex={menu ? 0 : -1} onClick={go('#aloqa')}>
            {t.nav.contact}
          </a>
          <a href={CATALOG_URL} tabIndex={menu ? 0 : -1} target="_blank" rel="noreferrer">
            {t.nav.catalogPdf}
          </a>
        </div>
      </div>

      <WeatherControl />

      <aside className="rail" aria-hidden>
        <div className="rail__track">
          <div className="rail__fill" />
        </div>
        <ol>
          {CHAPTERS.map((c, i) => (
            <li key={c.id} className="rail__item">
              <b>{String(c.id).padStart(2, '0')}</b>
              <span>{t.chapters[i]}</span>
            </li>
          ))}
        </ol>
      </aside>

      {/* ---------- 01 — Biz haqimizda ---------- */}
      <section className="cap cap--hero" data-cap="hero">
        <p className="eyebrow">{st.hero.eyebrow}</p>
        <h1>
          <Lines lines={st.hero.title} accent />
        </h1>
        <p className="lead">{st.hero.lead}</p>
        <div className="cta">
          <a className="btn btn--primary" href="#haqimizda" onClick={go('#haqimizda')}>
            {st.hero.about}
          </a>
          <a className="btn btn--ghost" href="#loyihalar" onClick={go('#loyihalar')}>
            {st.hero.projects}
          </a>
        </div>
      </section>

      <section className="cap" data-cap="since">
        <p className="chapter">{st.aboutChapter}</p>
        <h2>{st.since.title}</h2>
        <p className="lead">{st.since.text}</p>
      </section>

      <section className="cap" data-cap="mission">
        <p className="chapter">{st.aboutChapter}</p>
        <h2>{st.mission.title}</h2>
        <p className="lead">{st.mission.text}</p>
      </section>

      <section className="cap" data-cap="vision">
        <p className="chapter">{st.aboutChapter}</p>
        <h2>{st.vision.title}</h2>
        <p className="lead">{st.vision.text}</p>
      </section>

      <section className="cap" data-cap="values">
        <p className="chapter">{st.aboutChapter}</p>
        <h2>{st.values.title}</h2>
        <ul className="chips chips--big">
          {st.values.items.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <p className="lead">{st.values.text}</p>
      </section>

      <section className="cap" data-cap="about">
        <p className="chapter">UZ GROW</p>
        <h2 className="h2--sm">{st.about.headline}</h2>
        <Next {...st.about.next} />
      </section>

      {/* ---------- 02 — Xizmatlar ---------- */}
      <section className="cap" data-cap="services">
        <p className="chapter">{st.services.chapter}</p>
        <h2>{st.services.title}</h2>
        <ul className="chips">
          {st.services.items.map((v) => (
            <li key={v}>{v}</li>
          ))}
        </ul>
        <p className="lead">{st.services.text}</p>
      </section>

      <section className="cap cap--systems" data-cap="equipment">
        <p className="chapter">
          {st.equipment.chapter} <span className="xray-tag">X-RAY</span>
        </p>
        <h2>{st.equipment.title}</h2>
        <ol className="systems">
          {SYSTEMS.map((x, i) => (
            <li key={x.key} className={`sys sys--${x.key}`}>
              <i>{String(i + 1).padStart(2, '0')}</i>
              <div>
                <b>{st.equipment.systems[x.key].title}</b>
                <p>{st.equipment.systems[x.key].text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="cap" data-cap="team">
        <p className="chapter">{st.services.chapter}</p>
        <h2>{st.team.title}</h2>
        <p className="lead">{st.team.text}</p>
        <Next {...st.team.next} />
      </section>

      {/* ---------- 03 — Loyihalash ---------- */}
      <section className="cap" data-cap="turnkey">
        <p className="chapter">{st.turnkey.chapter}</p>
        <h2>
          <Lines lines={st.turnkey.title} />
        </h2>
        <p className="lead">{st.turnkey.text}</p>
      </section>

      <section className="cap cap--spec" data-cap="consulting">
        <p className="chapter">{st.consulting.chapter}</p>
        <ol className="numlist">
          {st.consulting.items.map((c, i) => (
            <li key={c}>
              <i>{String(i + 1).padStart(2, '0')}</i>
              {c}
            </li>
          ))}
        </ol>
      </section>

      <section className="cap cap--spec" data-cap="types">
        <p className="chapter">{st.types.chapter}</p>
        <dl className="spec">
          {st.types.items.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cap" data-cap="open">
        <p className="chapter">{st.turnkey.chapter}</p>
        <h2>
          <Lines lines={st.open.title} />
        </h2>
        <Next {...st.open.next} />
      </section>

      {/* ---------- 04 — Jamoa va natija ---------- */}
      <section className="cap cap--spec" data-cap="leaders">
        <p className="chapter">{st.leaders.chapter}</p>
        <dl className="spec spec--team">
          {st.leaders.items.map((m) => (
            <div key={m.name}>
              <dt>{m.role}</dt>
              <dd>{m.name}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cap" data-cap="founder">
        <p className="chapter">{st.founder.chapter}</p>
        <h2>{st.founder.name}</h2>
        <p className="lead">{st.founder.bio}</p>
        <ul className="chips">
          {st.founder.chips.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="cap" data-cap="crops">
        <p className="chapter">{st.crops.chapter}</p>
        <h2>{st.crops.title}</h2>
        <ul className="chips">
          {st.crops.items.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
      </section>

      <section className="cap cap--spec" data-cap="presidential">
        <p className="chapter">{st.presidential.chapter}</p>
        <dl className="spec spec--projects">
          {st.presidential.items.map((p) => (
            <div key={p.name}>
              <dt>{p.year}</dt>
              <dd>
                <b>{p.name}</b>
                <span>{p.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="cap" data-cap="result">
        <p className="chapter">{st.result.chapter}</p>
        <h2>{st.result.title}</h2>
        <p className="lead">{st.result.text}</p>
        <Next {...st.result.next} />
      </section>

      {/* ---------- 05 — Qudrat va hamkorlik ---------- */}
      <section className="cap" data-cap="intl">
        <p className="chapter">{st.intl.chapter}</p>
        <h2>
          <Lines lines={st.intl.title} />
        </h2>
        <ul className="chips">
          {st.intl.items.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <p className="lead">{st.vision.text}</p>
      </section>

      <section className="cap cap--stats" data-cap="power">
        <p className="chapter">{st.numbers.chapter}</p>
        <StatGrid items={POWER.map((p, i) => ({ ...p, label: st.power[i] }))} a={at(5, 0.34)} b={at(5, 0.45)} />
      </section>

      <section className="cap cap--final" data-cap="final">
        <p className="chapter">UZ GROW</p>
        <h2>
          <Lines lines={st.final.title} accent />
        </h2>
        <div className="cta">
          <a className="btn btn--primary" href="#haqimizda" onClick={go('#haqimizda')}>
            {st.final.about}
          </a>
          <a className="btn btn--ghost" href="#aloqa" onClick={go('#aloqa')}>
            {st.final.contact}
          </a>
        </div>
      </section>

      <div className="scroll-hint">
        <span>{st.scrollHint}</span>
        <i />
      </div>
    </div>
  )
}
