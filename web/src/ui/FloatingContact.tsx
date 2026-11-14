import { useState } from 'react'
import { CONTACT } from '../data/company'
import { WHATSAPP_PHONE } from '../data/site-extra'
import { useT } from '../i18n'

/** Har qanday joydan bir bosishda bog'lanish: asosiy saytdagi kabi WhatsApp, Telegram, qo'ng'iroq. */
export function FloatingContact() {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <div className={`fab${open ? ' is-open' : ''}`}>
      <div className="fab__menu" hidden={!open}>
        <a href={`https://wa.me/${WHATSAPP_PHONE}`} target="_blank" rel="noreferrer">WhatsApp</a>
        <a href={`https://t.me/${CONTACT.telegram}`} target="_blank" rel="noreferrer">Telegram</a>
        <a href={CONTACT.phoneHref}>{t.fab.call}</a>
      </div>
      <button type="button" className="fab__btn" aria-expanded={open} aria-label={open ? t.common.close : t.fab.contact} onClick={() => setOpen(!open)}>
        {open ? (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.9A8 8 0 1 1 21 12Z" />
          </svg>
        )}
      </button>
    </div>
  )
}
