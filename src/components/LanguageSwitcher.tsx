import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SUPPORTED_LANGUAGES } from '../i18n'

interface LanguageSwitcherProps {
  variant?: 'compact' | 'full'
}

export function LanguageSwitcher({ variant = 'compact' }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0]

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function selectLanguage(code: string) {
    i18n.changeLanguage(code)
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={
          variant === 'compact'
            ? 'flex h-8 w-8 items-center justify-center rounded-full border border-line/20 bg-well/30 text-base transition hover:scale-105'
            : 'flex w-full items-center justify-between rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition hover:border-line/25'
        }
        aria-label="Cambiar idioma"
      >
        {variant === 'compact' ? (
          <span>{current.flag}</span>
        ) : (
          <span className="flex items-center space-x-2">
            <span>{current.flag}</span>
            <span>{current.label}</span>
          </span>
        )}
      </button>

      {open && (
        <div className="glass-modal absolute right-0 z-50 mt-2 max-h-72 w-40 space-y-1 overflow-y-auto rounded-2xl p-1.5">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className={`flex w-full items-center space-x-2 rounded-xl px-2.5 py-2 text-left text-xs font-medium transition ${
                lang.code === current.code ? 'bg-indigo-500/20 text-ink' : 'text-ink-muted hover:bg-line/5'
              }`}
            >
              <span className="text-sm">{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
