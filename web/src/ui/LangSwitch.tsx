import { LANGS, setLang, useLang, useT } from '../i18n'

/** Tilni almashtirish: tepadagi panelda va mobil menyuda. Tanlov saqlanadi (i18n/index.ts). */
export function LangSwitch({ className = '', hidden }: { className?: string; hidden?: boolean }) {
  const lang = useLang()
  const t = useT()
  return (
    <div className={`langs ${className}`} role="group" aria-label={t.common.language}>
      {LANGS.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          title={l.name}
          aria-label={l.name}
          aria-pressed={lang === l.code}
          tabIndex={hidden ? -1 : undefined}
          onClick={() => void setLang(l.code)}
        >
          {l.short}
        </button>
      ))}
    </div>
  )
}
