import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { Feature } from 'geojson'
import uzbekistan from '../data/uzbekistan.json'
import MEDIA from '../data/media.json'
import { CALC, CONTACT, POWER } from '../data/company'
import {
  BIG_PHOTOS,
  CATALOG_URL,
  COORDS,
  CROP_PHOTOS,
  EQUIPMENT_ITEMS,
  GALLERY,
  INTL_PHOTOS,
  INVESTOR_MODELS,
  MAP_EMBED,
  MEDIA_PHONE,
  MEDIA_STATS,
  NAV_GROUPS,
  PROJECT_META,
  SERVICE_PHOTOS,
  TAPLINK_URL,
  TEAM_ORDER,
  TECH_BENEFITS,
  TYPE_CARDS,
  TYPE_TABLE,
  VIDEO,
} from '../data/site-extra'
import { formatNumber, useSite, useT, type SiteContent } from '../i18n'
import { lockScroll, scrollTo } from '../scroll'

/**
 * 3D hikoyadan keyingi qism: kompaniya haqida to'liq ma'lumot. Matnlar asosiy saytdan (site-content.*.json,
 * scripts/import-content.mjs, joriy tilda: useSite), qolgan yorliqlar i18n/{uz,ru,en}.ts da (useT), rasmlar siqilgan holda (public/media, scripts/import-media.mjs).
 * Bo'limlar oddiy scroll bilan o'qiladi; 3D bu paytda to'xtab turadi.
 */

// ---------- Umumiy bo'laklar ----------

const mediaName = (p: string) => p.replace(/^images\/(site\/)?/, '').replace(/^team\//, 'team-').replace(/\.\w+$/, '').replace(/[^\w-]+/g, '-')

function Photo({ src, alt = '', sizes = '(max-width: 760px) 100vw, 50vw', className, eager }: { src: string; alt?: string; sizes?: string; className?: string; eager?: boolean }) {
  const name = mediaName(src)
  const [w, h] = (MEDIA as Record<string, number[]>)[name] ?? [1500, 1000]
  return (
    <img
      className={className}
      src={`/media/${name}.webp`}
      srcSet={`/media/${name}-s.webp 640w, /media/${name}.webp ${w}w`}
      sizes={sizes}
      alt={alt}
      width={w}
      height={h}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
    />
  )
}

/** Bo'lim ekranga kirganda "is-in" klassi qo'shiladi: yumshoq paydo bo'lish CSS'da. */
function useReveal<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add('is-in')
          io.disconnect()
        }
      },
      { threshold: 0, rootMargin: '0px 0px -6% 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return ref
}

function Section({ id, tone = 'paper', children, className = '' }: { id: string; tone?: 'paper' | 'white' | 'forest' | 'sand'; children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLElement>()
  return (
    <section id={id} ref={ref} className={`sec sec--${tone} ${className}`}>
      <div className="sec__in">{children}</div>
    </section>
  )
}

function Head({ eyebrow, title, lead, wide }: { eyebrow: string; title: ReactNode; lead?: string; wide?: boolean }) {
  return (
    <header className={`head${wide ? ' head--wide' : ''}`}>
      <p className="head__eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      {lead && <p className="head__lead">{lead}</p>}
    </header>
  )
}

/** Yon oyna: ekin, loyiha yoki xodim tafsiloti. Esc va fon bosilganda yopiladi. */
function Drawer({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const closeLabel = useT().common.close
  useEffect(() => {
    lockScroll(true)
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', key)
    }
  }, [onClose])
  return (
    <div className="drawer" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
      <div className="drawer__panel" data-lenis-prevent onClick={(e) => e.stopPropagation()}>
        <button type="button" className="drawer__close" onClick={onClose} aria-label={closeLabel}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {children}
      </div>
    </div>
  )
}

const Check = () => (
  <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m3 8.5 3.2 3.2L13 5" />
  </svg>
)

const Arrow = () => (
  <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M3 8h10M9 4l4 4-4 4" />
  </svg>
)

const Ticks = ({ items, tone }: { items: string[]; tone?: string }) => (
  <ul className={`ticks${tone ? ` ticks--${tone}` : ''}`}>
    {items.map((f) => (
      <li key={f}>
        <Check />
        {f}
      </li>
    ))}
  </ul>
)

const usd = (v: number) => '$' + formatNumber(Math.round(v))

const jump = (href: string) => (e: { preventDefault: () => void }) => {
  e.preventDefault()
  scrollTo(href)
}

// ---------- Biz haqimizda ----------

function About() {
  const t = useT()
  const a = useSite().about
  return (
    <Section id="haqimizda" className="sec--about">
      <Head eyebrow={a.tagline} title={a.headline} wide />
      <div className="numbers">
        {POWER.map((p, i) => (
          <div key={p.value}>
            <b>
              {formatNumber(p.value)}
              {p.suffix}
            </b>
            <span>{t.story.power[i]}</span>
          </div>
        ))}
      </div>
      <div className="split">
        <figure className="split__photo">
          <Photo src={BIG_PHOTOS.expo} alt={t.after.expoAlt} />
        </figure>
        <div className="prose">
          <p className="prose__first">{a.descriptionText}</p>
          <p>{a.descriptionTop}</p>
        </div>
      </div>
      <div className="trio">
        <article>
          <h3>{a.mission}</h3>
          <p>{a.missionDesc}</p>
        </article>
        <article>
          <h3>{a.vision}</h3>
          <p>{a.visionDesc}</p>
        </article>
        <article>
          <h3>{a.valuesTitle}</h3>
          <p>{a.valuesAndRules.desc}</p>
          <ul className="pills">
            {a.values.map((v) => (
              <li key={v}>{v}</li>
            ))}
          </ul>
        </article>
      </div>
      <div className="split split--rev">
        <div className="prose">
          <h3>{a.businessScopeTitle.replace(':', '')}</h3>
          <p>{a.businessScopeDesc}</p>
          <h3>{a.professionalTeamTitle.replace(':', '')}</h3>
          <p>{a.professionalTeamDesc}</p>
        </div>
        <figure className="split__photo">
          <Photo src={BIG_PHOTOS.office} alt={t.after.officeAlt} />
        </figure>
      </div>
      <blockquote className="manifest">{a.descriptionBottom}</blockquote>
    </Section>
  )
}

/** To'liq kenglikdagi video: faqat ekranga kelganda yuklanadi va o'ynaydi. */
function VideoBand() {
  const site = useSite()
  const label = useT().after.videoLabel
  const ref = useRef<HTMLVideoElement>(null)
  const [src, setSrc] = useState<string | null>(null)
  const [poster, setPoster] = useState<string | undefined>(undefined)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const near = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setPoster(`/media/${mediaName(VIDEO.poster)}.webp`)
          near.disconnect()
        }
      },
      { rootMargin: '800px' },
    )
    near.observe(v)
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData
    if (saveData || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSrc(window.innerHeight > window.innerWidth ? VIDEO.portrait : VIDEO.src)
          void v.play().catch(() => {})
        } else v.pause()
      },
      { threshold: 0.2 },
    )
    io.observe(v)
    return () => io.disconnect()
  }, [])
  const slides = Object.values(site.hero.slides)
  return (
    <section className="videoband" aria-label={label}>
      <video ref={ref} src={src ?? undefined} poster={poster} muted loop playsInline preload="none" />
      <div className="videoband__text">
        <p className="head__eyebrow">{slides[0].author}</p>
        <blockquote>{slides[0].quote}</blockquote>
      </div>
    </section>
  )
}

// ---------- Jarayon ----------

function Process() {
  const h = useSite().homeBlocks
  return (
    <Section id="jarayon" tone="white">
      <Head eyebrow={h.processEyebrow} title={h.processTitle} lead={h.processText} />
      <ol className="steps">
        {h.steps.map((s, i) => (
          <li key={s.title}>
            <i>{String(i + 1).padStart(2, '0')}</i>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </li>
        ))}
      </ol>
    </Section>
  )
}

// ---------- Xizmatlar ----------

function Services() {
  const p = useSite().servicesPage
  return (
    <Section id="xizmatlar">
      <Head eyebrow={p.badge} title={p.title} lead={p.subtitle} />
      <div className="services">
        {p.items.map((s, i) => (
          <article key={s.title} className="service">
            <figure>
              <Photo src={SERVICE_PHOTOS[i]} alt={s.title} />
            </figure>
            <div>
              <i>{String(i + 1).padStart(2, '0')}</i>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <p className="service__label">{p.includesLabel}</p>
              <Ticks items={s.features} />
              <p className="service__result">
                <b>{p.resultLabel}:</b> {s.result}
              </p>
            </div>
          </article>
        ))}
      </div>
      <div className="band">
        <div>
          <h3>{p.ctaTitle}</h3>
          <p>{p.ctaText}</p>
        </div>
        <a className="button" href="#aloqa" onClick={jump('#aloqa')}>
          {p.ctaButton}
          <Arrow />
        </a>
      </div>
    </Section>
  )
}

// ---------- Issiqxona turlari ----------

type TypeData = { title: string; description: string; features: string[]; complexity: string; durability: string; cost: string; maintenance: string }

function Greenhouses() {
  const t = useT().after
  const g = useSite().greenhouse
  const types = g as unknown as Record<string, TypeData>
  const c = g.comparison
  return (
    <Section id="issiqxonalar" tone="sand">
      <Head eyebrow={g.title} title={g.subtitle} lead={g.description} />
      <div className="typecards">
        {TYPE_CARDS.map((t) => {
          const d = types[t.key]
          return (
            <article key={t.key} className="typecard">
              <div className="typecard__photos">
                {t.photos.slice(0, 1).map((p) => (
                  <Photo key={p} src={p} alt={d.title} sizes="(max-width: 760px) 100vw, 45vw" />
                ))}
                <span>{d.durability}</span>
              </div>
              <h3>{d.title}</h3>
              <p>{d.description}</p>
              <Ticks items={d.features} />
            </article>
          )
        })}
      </div>
      <div className="tablewrap">
        <h3>{c.title}</h3>
        <p>{c.subtitle}</p>
        <div className="tablewrap__scroll" data-lenis-prevent-horizontal>
          <table>
            <thead>
              <tr>
                <th scope="col">{t.typeColumn}</th>
                <th scope="col">{t.complexityColumn}</th>
                <th scope="col">{c.serviceLife}</th>
                <th scope="col">{c.cost}</th>
                <th scope="col">{c.maintenance}</th>
              </tr>
            </thead>
            <tbody>
              {TYPE_TABLE.map((k) => (
                <tr key={k}>
                  <th scope="row">{types[k].title}</th>
                  <td>{types[k].complexity}</td>
                  <td>{types[k].durability}</td>
                  <td>{types[k].cost}</td>
                  <td>{types[k].maintenance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="guide">
        <h3>{g.guide.title}</h3>
        <div>
          {[
            [g.guide.beginners, g.guide.beginnersDesc],
            [g.guide.professionals, g.guide.professionalsDesc],
            [g.guide.business, g.guide.businessDesc],
          ].map(([t, d]) => (
            <article key={t}>
              <b>{t}</b>
              <p>{d}</p>
            </article>
          ))}
        </div>
        <a className="linkarrow" href="#aloqa" onClick={jump('#aloqa')}>
          {g.guide.consult}
          <Arrow />
        </a>
      </div>
    </Section>
  )
}

// ---------- Ekinlar ----------

type Crop = SiteContent['cropsPage']['items'][number]

function CropDetail({ crop, onClose }: { crop: Crop; onClose: () => void }) {
  const p = useSite().cropsPage
  const [open, setOpen] = useState(0)
  return (
    <Drawer title={crop.name} onClose={onClose}>
      <figure className="drawer__cover">
        <Photo src={CROP_PHOTOS[crop.code]} alt={crop.name} sizes="(max-width: 760px) 100vw, 640px" />
      </figure>
      <div className="drawer__body">
        <h2>{crop.name}</h2>
        <p className="drawer__tag">{crop.tagline}</p>
        <p>{crop.intro}</p>
        <h3>{p.conditionsTitle}</h3>
        <dl className="specs">
          {crop.conditions.map((c) => (
            <div key={c.label}>
              <dt>{c.label}</dt>
              <dd>{c.value}</dd>
            </div>
          ))}
        </dl>
        <h3>{p.greenhouseTitle}</h3>
        <p>{crop.greenhouse}</p>
        <h3>{p.methodsTitle}</h3>
        <Ticks items={crop.methods} />
        <h3>{p.faqTitle}</h3>
        <div className="faq">
          {crop.faq.map((f, i) => (
            <div key={f.q} className={open === i ? 'is-open' : ''}>
              <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}>
                {f.q}
                <i aria-hidden />
              </button>
              {open === i && <p>{f.a}</p>}
            </div>
          ))}
        </div>
        <div className="drawer__cta">
          <b>{p.ctaTitle}</b>
          <p>{p.ctaText}</p>
          <a
            className="button"
            href="#aloqa"
            onClick={(e) => {
              onClose()
              jump('#aloqa')(e)
            }}
          >
            {p.ctaButton}
            <Arrow />
          </a>
        </div>
      </div>
    </Drawer>
  )
}

function Crops() {
  const p = useSite().cropsPage
  const [activeCode, setActive] = useState<string | null>(null)
  const active = p.items.find((c) => c.code === activeCode) // tanlov kod bo'yicha: til almashganda ham shu ekin qoladi
  return (
    <Section id="ekinlar">
      <Head eyebrow={p.badge} title={p.title} lead={p.subtitle} />
      <div className="crops">
        {p.items.map((c) => (
          <button type="button" key={c.code} className="crop" onClick={() => setActive(c.code)}>
            <Photo src={CROP_PHOTOS[c.code]} alt="" sizes="(max-width: 760px) 80vw, 25vw" />
            <span className="crop__text">
              <b>{c.name}</b>
              <small>{c.tagline}</small>
              <em>
                {p.more}
                <Arrow />
              </em>
            </span>
          </button>
        ))}
      </div>
      {active && <CropDetail crop={active} onClose={() => setActive(null)} />}
    </Section>
  )
}

// ---------- Jihozlar va texnologiya ----------

function Technology() {
  const site = useSite()
  const t = site.technology as unknown as Record<string, { title: string; description: string }> & { title: string; subtitle: string; description: string }
  const tp = site.techPage
  return (
    <>
      <Section id="jihozlar" tone="forest">
        <Head eyebrow={t.title as unknown as string} title={t.subtitle as unknown as string} lead={t.description as unknown as string} />
        <div className="equip">
          {EQUIPMENT_ITEMS.map((e, i) => (
            <article key={e.key} className={i === 0 ? 'equip__big' : ''}>
              <Photo src={e.photo} alt={t[e.key].title} sizes="(max-width: 760px) 100vw, 40vw" />
              <div>
                <h3>{t[e.key].title}</h3>
                <p>{t[e.key].description}</p>
              </div>
            </article>
          ))}
        </div>
      </Section>
      <Section id="texnologiya" tone="white">
        <Head eyebrow={tp.hero.badge} title={tp.hero.title} lead={tp.hero.desc} />
        <div className="numbers numbers--four">
          {tp.benefits.map((b, i) => (
            <div key={b.label}>
              <b>{TECH_BENEFITS[i]}</b>
              <span>{b.label}</span>
            </div>
          ))}
        </div>
        <h3 className="subhead">{tp.technologies.title}</h3>
        <p className="subhead__lead">{tp.technologies.desc}</p>
        <div className="techlist">
          {tp.technologies.items.map((x) => (
            <article key={x.title}>
              <h4>{x.title}</h4>
              <p>{x.description}</p>
              <ul className="pills pills--soft">
                {x.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </Section>
    </>
  )
}

// ---------- Agro-injiniring ----------

function Agro() {
  const a = useSite().agro
  return (
    <Section id="agro">
      <Head eyebrow={a.hero.badge} title={a.services.title} lead={a.hero.desc} />
      <div className="cards4">
        {a.services.items.map((s) => (
          <article key={s.title}>
            <h3>{s.title}</h3>
            <p>{s.description}</p>
            <ul className="pills pills--soft">
              {s.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <div className="agrogrid">
        <div>
          <h3 className="subhead">{a.benefits.title}</h3>
          <p className="subhead__lead">{a.benefits.desc}</p>
          <dl className="specs specs--loose">
            {a.benefits.items.map((b) => (
              <div key={b.title}>
                <dt>{b.title}</dt>
                <dd>{b.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="subhead">{a.technologies.title}</h3>
          <p className="subhead__lead">{a.technologies.desc}</p>
          <dl className="specs specs--loose">
            {a.technologies.items.map((b) => (
              <div key={b.name}>
                <dt>{b.name}</dt>
                <dd>{b.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <ol className="miniflow" aria-label={a.process.desc}>
        {a.process.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
    </Section>
  )
}

// ---------- Loyihalar ----------

const FILTERS = ['all', 'presidential', 'international', 'greenhouse', 'agriculture'] as const
type ProjectItem = SiteContent['projects']['items'][number]

function ProjectDetail({ item, index, onClose }: { item: ProjectItem; index: number; onClose: () => void }) {
  const m = PROJECT_META[index]
  const p = useSite().projects
  const t = useT().after
  return (
    <Drawer title={item.title} onClose={onClose}>
      <div className="drawer__body">
        <p className="drawer__tag">{p.categories[m.category as keyof typeof p.categories]}</p>
        <h2>{item.title}</h2>
        <p>{item.description}</p>
        <dl className="specs">
          <div>
            <dt>{t.location}</dt>
            <dd>{item.location}</dd>
          </div>
          <div>
            <dt>{t.area}</dt>
            <dd>{item.size}</dd>
          </div>
          <div>
            <dt>{t.year}</dt>
            <dd>{m.year}</dd>
          </div>
          <div>
            <dt>{p.investment}</dt>
            <dd>{t.million(m.investment)}</dd>
          </div>
          <div>
            <dt>{p.client}</dt>
            <dd>{item.client}</dd>
          </div>
          <div>
            <dt>{p.status}</dt>
            <dd>{m.status === 'done' ? t.statusDone : t.statusProgress}</dd>
          </div>
        </dl>
        <h3>{p.technologies}</h3>
        <ul className="pills pills--soft">
          {item.technologies.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="drawer__gallery">
        {[...new Set(m.photos)].map((ph) => (
          <Photo key={ph} src={ph} alt={item.title} sizes="(max-width: 760px) 100vw, 640px" />
        ))}
      </div>
    </Drawer>
  )
}

function Projects() {
  const p = useSite().projects
  const t = useT().after
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>('all')
  const [active, setActive] = useState<number | null>(null)
  const list = p.items.map((item, i) => ({ item, i, m: PROJECT_META[i] })).filter((x) => filter === 'all' || x.m.category === filter)
  return (
    <Section id="loyihalar" tone="white">
      <Head eyebrow={p.title} title={p.subtitle} lead={p.description} />
      <div className="tabs" role="group" aria-label={t.projectFilter}>
        {FILTERS.map((f) => (
          <button key={f} type="button" className={filter === f ? 'is-on' : ''} aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {p.categories[f]}
          </button>
        ))}
      </div>
      <div className="projectgrid">
        {list.map(({ item, i, m }) => (
          <button type="button" key={item.title} className="pcard" onClick={() => setActive(i)}>
            <span className="pcard__media">
              <Photo src={m.photos[0]} alt="" sizes="(max-width: 760px) 100vw, 33vw" />
              {m.featured && <span className="pcard__flag">{p.featured}</span>}
              {m.status === 'progress' && <span className="pcard__flag pcard__flag--amber">{t.statusProgress}</span>}
            </span>
            <span className="pcard__body">
              <b>{item.title}</b>
              <small>
                {item.location} · {m.year}
              </small>
              <span className="pcard__meta">
                <em>{item.size}</em>
                <em>{t.million(m.investment)}</em>
              </span>
            </span>
          </button>
        ))}
      </div>
      {active !== null && <ProjectDetail item={p.items[active]} index={active} onClose={() => setActive(null)} />}
      <ProjectsMap />
    </Section>
  )
}

const MAP_W = 800
const MAP_H = 420

function ProjectsMap() {
  const ref = useReveal<HTMLDivElement>()
  const site = useSite()
  const t = useT().after
  const { d, pins } = useMemo(() => {
    const feature = uzbekistan as unknown as Feature
    const projection = geoMercator().fitExtent(
      [
        [24, 24],
        [MAP_W - 24, MAP_H - 24],
      ],
      feature,
    )
    return {
      d: geoPath(projection)(feature) ?? '',
      pins: PROJECT_META.map((m) => projection([m.lon, m.lat]) ?? [0, 0]),
    }
  }, [])
  const mp = site.map
  return (
    <div className="geo" ref={ref}>
      <div className="geo__text">
        <p className="head__eyebrow">{mp.badge}</p>
        <h3>{mp.title}</h3>
        <p>
          {mp.subtitle}. {mp.hubNote}.
        </p>
      </div>
      <svg viewBox={`0 0 ${MAP_W} ${MAP_H}`} role="img" aria-label={t.mapLabel}>
        <path className="geo__land" d={d} pathLength={1} />
        {pins.map((xy, i) => (
          <g key={i} className="geo__pin" transform={`translate(${xy[0]} ${xy[1]})`} style={{ ['--i' as string]: i }}>
            <circle r="16" />
            <circle r="4.5" />
            <text x="10" y="-8">
              {t.mapPins[i]}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

// ---------- Xalqaro hamkorlik ----------

function International() {
  const site = useSite()
  const title = useT().after.intlTitle
  const ip = site.internationalPage
  // Asosiy saytdagi kartalarning tavsif matni boshqa loyihalardan qolib ketgan, shuning uchun xaritadagi izoh olinadi
  const notes = Object.fromEntries(site.map.countries.map((c) => [c.name, c.note]))
  return (
    <Section id="xalqaro" tone="forest">
      <Head eyebrow={ip.title} title={title} lead={ip.description} />
      <div className="intl">
        {ip.projects.map((x, i) => (
          <article key={x.title}>
            <Photo src={INTL_PHOTOS[i]} alt={x.title} sizes="(max-width: 760px) 100vw, 25vw" />
            <div>
              <span className="intl__status">{x.status}</span>
              <h3>{x.country}</h3>
              <p>{notes[x.country] ?? x.title}</p>
              <small>{x.timeline}</small>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

// ---------- Galereya ----------

function Gallery() {
  const site = useSite()
  const t = useT().after
  const closeLabel = useT().common.close
  const g = site.projects.gallery
  const items = site.galleryPage.items
  const [tab, setTab] = useState<'all' | 'projects' | 'samarqand'>('all')
  const [limit, setLimit] = useState(12)
  const [open, setOpen] = useState<number | null>(null)
  const list = GALLERY.filter((x) => tab === 'all' || x.tab === tab)
  const shown = list.slice(0, limit)
  const current = open === null ? null : list[open]

  useEffect(() => {
    if (open === null) return
    lockScroll(true)
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') setOpen((v) => (v === null ? v : (v + 1) % list.length))
      if (e.key === 'ArrowLeft') setOpen((v) => (v === null ? v : (v - 1 + list.length) % list.length))
    }
    window.addEventListener('keydown', key)
    return () => {
      lockScroll(false)
      window.removeEventListener('keydown', key)
    }
  }, [open, list.length])

  const caption = (index: number) => (index >= 0 ? items[index] : null)
  return (
    <Section id="galereya">
      <Head eyebrow={g.title} title={t.galleryTitle} lead={g.description} />
      <div className="tabs" role="group" aria-label={t.galleryTabs}>
        {(
          [
            ['all', t.galleryAll],
            ['projects', g.projects],
            ['samarqand', g.samarqand],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={tab === k ? 'is-on' : ''}
            aria-pressed={tab === k}
            onClick={() => {
              setTab(k)
              setLimit(12)
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="masonry">
        {shown.map((x, i) => (
          <button type="button" key={x.photo} onClick={() => setOpen(i)} aria-label={caption(x.index)?.title ?? t.galleryZoom}>
            <Photo src={x.photo} alt={caption(x.index)?.title ?? t.galleryAlt} sizes="(max-width: 760px) 50vw, 25vw" />
          </button>
        ))}
      </div>
      {limit < list.length && (
        <button type="button" className="button button--line gallery__more" onClick={() => setLimit(limit + 12)}>
          {t.galleryMore} ({list.length - limit})
        </button>
      )}
      {current && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(null)}>
          <Photo src={current.photo} alt={caption(current.index)?.title ?? t.galleryAlt} sizes="100vw" eager />
          {caption(current.index) && (
            <p>
              <b>{caption(current.index)!.title}</b> {caption(current.index)!.description}
            </p>
          )}
          <button type="button" className="lightbox__nav lightbox__nav--prev" aria-label={t.prev} onClick={(e) => (e.stopPropagation(), setOpen((open! - 1 + list.length) % list.length))}>
            ‹
          </button>
          <button type="button" className="lightbox__nav lightbox__nav--next" aria-label={t.next} onClick={(e) => (e.stopPropagation(), setOpen((open! + 1) % list.length))}>
            ›
          </button>
          <button type="button" className="lightbox__close" aria-label={closeLabel}>
            ×
          </button>
        </div>
      )}
    </Section>
  )
}

// ---------- Jamoa ----------

type Member = { name: string; position: string; bio: string; experience: string; achievements: string[]; education: string[]; skills: string[] }

function Team() {
  const t = useSite().team
  const members = t.members as unknown as Record<string, Member>
  const [active, setActive] = useState<{ key: string; photo?: string } | null>(null)
  const m = active ? members[active.key] : null
  return (
    <Section id="jamoa" tone="white">
      <Head eyebrow={t.title} title={t.subtitle} lead={t.description} />
      <div className="team">
        {TEAM_ORDER.map((x) => (
          <button type="button" key={x.key} className="person" onClick={() => setActive(x)}>
            <span className="person__photo">{x.photo && <Photo src={x.photo} alt={members[x.key].name} sizes="(max-width: 760px) 50vw, 25vw" />}</span>
            <b>{members[x.key].name}</b>
            <small>{members[x.key].position}</small>
          </button>
        ))}
      </div>
      {active && m && (
        <Drawer title={m.name} onClose={() => setActive(null)}>
          {active.photo && (
            <figure className="drawer__cover drawer__cover--person">
              <Photo src={active.photo} alt={m.name} sizes="(max-width: 760px) 100vw, 640px" />
            </figure>
          )}
          <div className="drawer__body">
            <p className="drawer__tag">{m.position}</p>
            <h2>{m.name}</h2>
            <p>{m.bio}</p>
            <dl className="specs">
              <div>
                <dt>{t.experience}</dt>
                <dd>{m.experience}</dd>
              </div>
            </dl>
            <h3>{t.achievements}</h3>
            <Ticks items={m.achievements} />
            <h3>{t.education}</h3>
            <Ticks items={m.education} />
            <h3>{t.skills}</h3>
            <ul className="pills pills--soft">
              {m.skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        </Drawer>
      )}
    </Section>
  )
}

// ---------- Investorlar ----------

function Investors() {
  const v = useSite().investor
  return (
    <Section id="investorlar" tone="forest">
      <Head eyebrow={v.hero.badge} title={v.hero.title} lead={v.hero.desc} />
      <div className="numbers numbers--four numbers--dark">
        {v.hero.stats.map((s) => (
          <div key={s.label}>
            <b>{s.value}</b>
            <span>{s.label}</span>
          </div>
        ))}
      </div>
      <h3 className="subhead">{v.models.title}</h3>
      <p className="subhead__lead">{v.models.desc}</p>
      <div className="models">
        {v.models.items.map((m, i) => (
          <article key={m.title} className={INVESTOR_MODELS[i].popular ? 'is-popular' : ''}>
            {INVESTOR_MODELS[i].popular && <span>{v.models.popular}</span>}
            <h4>{m.title}</h4>
            <p>{m.description}</p>
            <dl>
              <div>
                <dt>{v.models.minInvestment}</dt>
                <dd>{usd(INVESTOR_MODELS[i].min)}</dd>
              </div>
              <div>
                <dt>ROI</dt>
                <dd>{INVESTOR_MODELS[i].roi}</dd>
              </div>
              <div>
                <dt>{v.models.period}</dt>
                <dd>{m.period}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
      <div className="agrogrid">
        <div>
          <h3 className="subhead">{v.benefits.title}</h3>
          <p className="subhead__lead">{v.benefits.desc}</p>
          <dl className="specs specs--loose specs--dark">
            {v.benefits.items.map((b) => (
              <div key={b.title}>
                <dt>{b.title}</dt>
                <dd>{b.description}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h3 className="subhead">{v.process.title}</h3>
          <ol className="vflow">
            {v.process.items.map((s) => (
              <li key={s.step}>
                <i>{s.step}</i>
                <b>{s.title}</b>
                <span>{s.desc}</span>
              </li>
            ))}
          </ol>
          <div className="band band--inline">
            <div>
              <h4>{v.cta.title}</h4>
              <p>{v.cta.desc}</p>
            </div>
            <a className="button" href="#aloqa" onClick={jump('#aloqa')}>
              {v.hero.contact}
              <Arrow />
            </a>
          </div>
        </div>
      </div>
    </Section>
  )
}

// ---------- Media hamkorlik ----------

function MediaPartner() {
  const m = useSite().media
  const t = useT().after
  return (
    <Section id="media" tone="sand">
      <Head eyebrow={t.mediaEyebrow} title={m.title} lead={m.footerDesc} />
      <div className="socialstats">
        {MEDIA_STATS.platforms.map((p) => (
          <a key={p.name} href={p.href} target="_blank" rel="noreferrer">
            <b>{p.value}</b>
            <span>{p.name}</span>
          </a>
        ))}
      </div>
      <div className="trio trio--plain">
        {[
          [m.realSector, m.realSectorDesc],
          [m.trustBrand, m.trustBrandDesc],
          [m.strongAudience, m.strongAudienceDesc],
        ].map(([t, d]) => (
          <article key={t}>
            <h3>{t}</h3>
            <p>{d}</p>
          </article>
        ))}
      </div>
      <div className="agrogrid">
        <div>
          <h3 className="subhead">{m.audienceTitle}</h3>
          <dl className="specs">
            <div>
              <dt>{m.totalReach}</dt>
              <dd>{formatNumber(MEDIA_STATS.reach)}+</dd>
            </div>
            <div>
              <dt>{m.ageGroup}</dt>
              <dd>{MEDIA_STATS.age}</dd>
            </div>
            <div>
              <dt>{m.regions}</dt>
              <dd>{t.mediaRegions}</dd>
            </div>
          </dl>
          <div className="gender" aria-label={`${m.women} ${MEDIA_STATS.women}%, ${m.men} ${MEDIA_STATS.men}%`}>
            <i style={{ width: `${MEDIA_STATS.women}%` }} />
            <span>
              {m.women} {MEDIA_STATS.women}%
            </span>
            <span>
              {m.men} {MEDIA_STATS.men}%
            </span>
          </div>
        </div>
        <div>
          <h3 className="subhead">{m.geographicTitle}</h3>
          <dl className="specs">
            {m.geographicCoverage.map((g) => (
              <div key={g.country}>
                <dt>{g.country}</dt>
                <dd>{g.description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <h3 className="subhead">{m.tariffsTitle}</h3>
      <div className="models models--light">
        {m.partnershipPlans.map((p) => (
          <article key={p.name}>
            <h4>{p.name}</h4>
            <p>{p.duration}</p>
            <dl>
              <div>
                <dt>{m.video.replace(':', '')}</dt>
                <dd>{p.videos}</dd>
              </div>
              <div>
                <dt>{m.post.replace(':', '')}</dt>
                <dd>{p.posts}</dd>
              </div>
            </dl>
            <p className="models__note">{p.features.join(', ')}</p>
          </article>
        ))}
      </div>
      <div className="band">
        <div>
          <h3>{m.foreignPartnersTitle}</h3>
          <p>
            {m.foreignPartners[0].partnership}. {m.foreignPartners[0].name}.
          </p>
        </div>
        <div className="band__actions">
          <a className="button" href={MEDIA_PHONE.href}>
            {MEDIA_PHONE.label}
          </a>
          <a className="button button--line" href={TAPLINK_URL} target="_blank" rel="noreferrer">
            Taplink
          </a>
        </div>
      </div>
    </Section>
  )
}

// ---------- Kalkulyator ----------

type CalcState = { area: number; crop: (typeof CALC.crops)[number]['key']; heating: (typeof CALC.heating)[number]['key'] }

function calculate(s: CalcState) {
  const crop = CALC.crops.find((c) => c.key === s.crop)!
  const heat = CALC.heating.find((h) => h.key === s.heating)!
  // Smeta asosida: doimiy qism + maydonga bog'liq qism, keyin kutilmagan xarajatlar va QQS (data/company.ts)
  const capex = (CALC.fixed + s.area * (CALC.perM2 + heat.perM2)) * (1 + CALC.contingency) * (1 + CALC.vat)
  const harvest = (s.area * crop.yield * heat.yieldK) / 1000 // tonna
  const revenue = harvest * 1000 * crop.price
  const profit = revenue * (1 - CALC.opex)
  return { capex, harvest, revenue, payback: profit > 0 ? capex / profit : Infinity, crop, heat }
}

function Calculator({ onApply }: { onApply: (summary: string) => void }) {
  const t = useT().calc
  const [s, setS] = useState<CalcState>({ area: CALC.area.default, crop: 'tomato', heating: 'gas' })
  const r = calculate(s)
  const ha = s.area / 10000
  const fill = ((s.area - CALC.area.min) / (CALC.area.max - CALC.area.min)) * 100
  return (
    <Section id="hisob" tone="white">
      <Head eyebrow={t.eyebrow} title={t.title} lead={t.lead} />
      <div className="calc">
        <div className="calc__form">
          <label className="control">
            <span>
              {t.area}{' '}
              <b>
                {formatNumber(s.area)} {t.m2}
              </b>{' '}
              <small>
                ({formatNumber(ha, ha < 1 ? 2 : 1)} {t.hectare})
              </small>
            </span>
            <input
              type="range"
              min={CALC.area.min}
              max={CALC.area.max}
              step={CALC.area.step}
              value={s.area}
              style={{ ['--fill' as string]: `${fill}%` }}
              onChange={(e) => setS({ ...s, area: Number(e.target.value) })}
            />
          </label>
          <div className="control">
            <span>{t.crop}</span>
            <div className="tabs tabs--compact">
              {CALC.crops.map((c) => (
                <button key={c.key} type="button" className={s.crop === c.key ? 'is-on' : ''} aria-pressed={s.crop === c.key} onClick={() => setS({ ...s, crop: c.key })}>
                  {t.crops[c.key]}
                </button>
              ))}
            </div>
          </div>
          <div className="control">
            <span>{t.heating}</span>
            <div className="tabs tabs--compact">
              {CALC.heating.map((h) => (
                <button key={h.key} type="button" className={s.heating === h.key ? 'is-on' : ''} aria-pressed={s.heating === h.key} onClick={() => setS({ ...s, heating: h.key })}>
                  {t.heatings[h.key]}
                </button>
              ))}
            </div>
          </div>
          <p className="calc__note">{t.note}</p>
        </div>
        <div className="calc__out">
          <div className="calc__main">
            <span>{t.investment}</span>
            <b>{usd(r.capex)}</b>
            <small>
              ≈ {usd(r.capex / s.area)} / {t.m2} · {t.perM2}
            </small>
          </div>
          <div className="calc__row">
            <div>
              <span>{t.harvest}</span>
              <b>
                ≈ {formatNumber(Math.round(r.harvest))} {t.tons}
              </b>
            </div>
            <div>
              <span>{t.revenue}</span>
              <b>≈ {usd(r.revenue)}</b>
            </div>
            <div>
              <span>{t.payback}</span>
              <b>{Number.isFinite(r.payback) ? `≈ ${t.years(formatNumber(r.payback, 1))}` : '—'}</b>
            </div>
          </div>
          <button
            type="button"
            className="button button--wide"
            onClick={() =>
              onApply(
                t.summary({
                  area: formatNumber(s.area),
                  crop: t.crops[s.crop],
                  heating: t.heatings[s.heating],
                  total: usd(r.capex),
                  perM2: usd(r.capex / s.area),
                  harvest: formatNumber(Math.round(r.harvest)),
                }),
              )
            }
          >
            {t.apply}
            <Arrow />
          </button>
        </div>
      </div>
    </Section>
  )
}

// ---------- Aloqa ----------

type Status = 'idle' | 'sending' | 'ok' | 'error'

function Contact({ prefill }: { prefill: string }) {
  const site = useSite()
  const t = useT()
  const c = site.contact
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState(prefill)
  const [showMap, setShowMap] = useState(false)
  const mapRef = useRef<HTMLDivElement>(null)
  useEffect(() => setMessage(prefill), [prefill])

  // Xarita og'ir (Yandex skriptlari): faqat ekranga yaqinlashganda yuklanadi
  useEffect(() => {
    const el = mapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShowMap(true)
          io.disconnect()
        }
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>
    if (data.website) return // spam-bot tuzog'i
    setStatus('sending')
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, phone: data.phone, email: data.email, service: data.service, region: data.region, message: data.message }),
      })
      setStatus(res.ok ? 'ok' : 'error')
    } catch {
      setStatus('error')
    }
  }

  const services = Object.values(c.services)
  return (
    <Section id="aloqa" tone="forest">
      <div className="contact">
        <div>
          <p className="head__eyebrow">{c.title}</p>
          <h2>{site.footer.ctaTitle}</h2>
          <p className="head__lead">{site.footer.ctaText}</p>
          <ul className="contact__list">
            <li>
              <span>{c.phoneLabel}</span>
              {CONTACT.phones.map((p) => (
                <a key={p} href={`tel:${p.replace(/[^+\d]/g, '')}`}>
                  {p}
                </a>
              ))}
            </li>
            <li>
              <span>{c.emailLabel}</span>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
            </li>
            <li>
              <span>{c.location}</span>
              <a href={CONTACT.mapUrl} target="_blank" rel="noreferrer">
                {c.address}
              </a>
              <small>{c.locationDetails}</small>
            </li>
            <li>
              <span>{c.workingHours}</span>
              {t.after.workHours.map(([d, h]) => (
                <p key={d}>
                  {d}: <b>{h}</b>
                </p>
              ))}
            </li>
          </ul>
        </div>
        {status === 'ok' ? (
          <div className="form form--done">
            <b>{c.success}</b>
            <p>{c.successMessage}</p>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <h3>{c.formTitle}</h3>
            <p>{c.formDescription}</p>
            <div className="form__row">
              <label>
                <span>{c.name}</span>
                <input name="name" required autoComplete="name" placeholder={c.namePlaceholder} />
              </label>
              <label>
                <span>{c.phone}</span>
                <input name="phone" required type="tel" autoComplete="tel" placeholder={c.phonePlaceholder} pattern="[+0-9 ()\-]{9,}" />
              </label>
            </div>
            <div className="form__row">
              <label>
                <span>{c.email}</span>
                <input name="email" type="email" autoComplete="email" placeholder={c.emailPlaceholder} />
              </label>
              <label>
                <span>{t.after.region}</span>
                <select name="region" defaultValue="">
                  <option value="" disabled>
                    {t.after.regionPick}
                  </option>
                  {/* Kalit indeks: til almashganda tanlangan variant saqlanadi */}
                  {t.after.regions.map((r, i) => (
                    <option key={i}>{r}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span>{c.service}</span>
              <select name="service" defaultValue="">
                <option value="" disabled>
                  {c.servicePlaceholder}
                </option>
                {services.map((s, i) => (
                  <option key={i}>{s}</option>
                ))}
              </select>
            </label>
            <label>
              <span>{c.message}</span>
              <textarea name="message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={c.messagePlaceholder} />
            </label>
            <input name="website" className="hp" tabIndex={-1} autoComplete="off" aria-hidden />
            <button className="button button--wide" disabled={status === 'sending'}>
              {status === 'sending' ? c.sending : c.send}
              <Arrow />
            </button>
            {status === 'error' && (
              <p className="form__error" role="alert">
                {c.errorMessage} <a href={CONTACT.phoneHref}>{CONTACT.phones[0]}</a>
              </p>
            )}
          </form>
        )}
      </div>
      <div className="mapframe" ref={mapRef}>
        {showMap && <iframe title={c.mapSubtitle} src={`${MAP_EMBED}&lang=${t.meta.mapLang}`} loading="lazy" allowFullScreen />}
        <span className="mapframe__coords">
          {c.coordinatesLabel}: {COORDS}
        </span>
      </div>
    </Section>
  )
}

// ---------- Footer va huquqiy matnlar ----------

type LegalDoc = { title: string; lastUpdated: string; sections: { title: string; content?: string; items: string[]; footer?: string; note?: string }[]; note?: string }

function LegalDrawer({ doc, onClose }: { doc: LegalDoc; onClose: () => void }) {
  return (
    <Drawer title={doc.title} onClose={onClose}>
      <div className="drawer__body">
        <h2>{doc.title}</h2>
        <p className="drawer__tag">{doc.lastUpdated}</p>
        {doc.sections.map((s) => (
          <div key={s.title}>
            <h3>{s.title}</h3>
            {s.content && <p>{s.content}</p>}
            <ul className="bullets">
              {s.items.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            {s.footer && <p>{s.footer}</p>}
            {s.note && <p className="drawer__note">{s.note}</p>}
          </div>
        ))}
        {doc.note && <p className="drawer__note">{doc.note}</p>}
        <p>
          {CONTACT.email} · {CONTACT.phones[0]}
        </p>
      </div>
    </Drawer>
  )
}

function Footer() {
  const site = useSite()
  const t = useT()
  const f = site.footer
  const [legalKey, setLegal] = useState<'privacy' | 'terms' | null>(null)
  const legal = legalKey && (site[legalKey] as LegalDoc)
  return (
    <footer className="foot">
      <div className="foot__top">
        <div className="foot__brand">
          <img src="/images/logo.png" alt="UZ GROW" width={146} height={60} loading="lazy" />
          <p>{t.after.footerText}</p>
          <a className="button button--line" href={CATALOG_URL} target="_blank" rel="noreferrer">
            {site.hero.downloadCatalog}
          </a>
        </div>
        {NAV_GROUPS.map((g) => (
          <nav key={g.key} aria-label={t.nav.groups[g.key]}>
            <h4>{t.nav.groups[g.key]}</h4>
            {g.items.map((href) => (
              <a key={href} href={href} onClick={jump(href)}>
                {t.nav.links[href]}
              </a>
            ))}
          </nav>
        ))}
      </div>
      <div className="foot__social">
        {CONTACT.social.map((s) => (
          <a key={s.name} href={s.href} target="_blank" rel="noreferrer">
            {s.name}
          </a>
        ))}
        <a href={CONTACT.website} target="_blank" rel="noreferrer">
          uzgrow.uz
        </a>
      </div>
      <div className="foot__bottom">
        <span>
          © {new Date().getFullYear()} UZ GROW. {f.allRightsReserved}.
        </span>
        <span>
          <button type="button" onClick={() => setLegal('privacy')}>
            {site.privacy.title}
          </button>
          <button type="button" onClick={() => setLegal('terms')}>
            {site.terms.title}
          </button>
        </span>
      </div>
      {legal && <LegalDrawer doc={legal} onClose={() => setLegal(null)} />}
    </footer>
  )
}

export default function AfterStory() {
  const [prefill, setPrefill] = useState('')
  return (
    <main className="after">
      <About />
      <VideoBand />
      <Process />
      <Services />
      <Greenhouses />
      <Crops />
      <Technology />
      <Agro />
      <Projects />
      <International />
      <Gallery />
      <Team />
      <Investors />
      <MediaPartner />
      <Calculator
        onApply={(summary) => {
          setPrefill(summary)
          scrollTo('#aloqa')
        }}
      />
      <Contact prefill={prefill} />
      <Footer />
    </main>
  )
}
