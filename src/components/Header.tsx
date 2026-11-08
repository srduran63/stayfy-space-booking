import { Building2, CalendarClock, Heart, Home, Menu, Moon, Sun } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { isAdminEmail } from '../lib/constants'
import { getInitials } from '../lib/utils'
import { LanguageSwitcher } from './LanguageSwitcher'
import { RegionSwitcher } from './RegionSwitcher'

interface HeaderProps {
  onOpenAuth: (mode: 'login' | 'signup') => void
  onOpenProfile: () => void
}

function GuestMenu({ onOpenAuth }: { onOpenAuth: (mode: 'login' | 'signup') => void }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('header.menu')}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-line/20 bg-well/20 text-ink transition hover:scale-105"
      >
        <Menu size={16} />
      </button>

      {open && (
        <div className="glass-modal absolute right-0 z-50 mt-2 w-56 space-y-1 rounded-2xl p-1.5">
          <button
            onClick={() => {
              setOpen(false)
              onOpenAuth('login')
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-ink transition hover:bg-line/5"
          >
            {t('header.login')}
          </button>
          <button
            onClick={() => {
              setOpen(false)
              onOpenAuth('signup')
            }}
            className="w-full rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-ink transition hover:bg-line/5"
          >
            {t('header.signup')}
          </button>
          <div className="my-1 h-px bg-line/10" />
          <button
            onClick={() => {
              setOpen(false)
              navigate('/asociarme')
            }}
            className="flex w-full items-center gap-2 rounded-xl bg-indigo-500/10 px-3 py-2.5 text-left text-xs font-semibold text-accent transition hover:bg-indigo-500/20"
          >
            <Building2 size={13} />
            {t('header.becomeHost')}
          </button>
        </div>
      )}
    </div>
  )
}

export function Header({ onOpenAuth, onOpenProfile }: HeaderProps) {
  const { user, profile, isHost } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const initials = user ? getInitials(profile?.full_name || user.email || 'US') : 'US'

  const themeToggle = (
    <button
      onClick={toggleTheme}
      title={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
      aria-label={theme === 'dark' ? t('header.switchToLight') : t('header.switchToDark')}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line/20 bg-well/20 text-ink transition hover:scale-105"
    >
      {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  )

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-line/10 bg-staydark/40 px-4 py-3.5 backdrop-blur-md sm:px-8">
      <div
        className="group flex cursor-pointer items-center space-x-2.5"
        onClick={() => navigate(user ? '/dashboard' : '/')}
      >
        <div className="flex items-center space-x-2">
          <img
            src="/favicon.svg"
            alt="Stayfy"
            className="h-7 w-auto transition-transform duration-300 group-hover:scale-110"
          />
          <span className="text-xl font-bold tracking-tight text-ink">Stayfy</span>
        </div>
      </div>

      {user ? (
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate('/favoritos')}
            className="glass-drop flex items-center space-x-2 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink"
          >
            <Heart size={12} />
            <span className="hidden sm:inline">{t('header.myFavorites')}</span>
          </button>
          <button
            onClick={() => navigate('/mis-reservas')}
            className="glass-drop flex items-center space-x-2 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink"
          >
            <CalendarClock size={12} />
            <span className="hidden sm:inline">{t('header.myBookings')}</span>
          </button>
          {isAdminEmail(user.email) && (
            <button
              onClick={() => navigate('/mis-espacios')}
              className="glass-drop flex items-center space-x-2 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink"
            >
              <Home size={12} />
              <span className="hidden sm:inline">{t('header.mySpaces')}</span>
            </button>
          )}
          {isHost && (
            <button
              onClick={() => navigate('/panel-dueno')}
              className="glass-drop flex items-center space-x-2 rounded-2xl px-3.5 py-2 text-xs font-semibold text-ink"
            >
              <Home size={12} />
              <span className="hidden sm:inline">{t('header.ownerPanel')}</span>
            </button>
          )}
          <RegionSwitcher />
          <LanguageSwitcher />
          {themeToggle}
          <button
            onClick={onOpenProfile}
            title={t('header.configureProfile')}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line/20 bg-indigo-600/60 text-xs font-bold text-white shadow-md transition hover:scale-105"
          >
            {initials}
          </button>
        </div>
      ) : (
        <div className="flex items-center space-x-3">
          <RegionSwitcher />
          <LanguageSwitcher />
          {themeToggle}
          <GuestMenu onOpenAuth={onOpenAuth} />
        </div>
      )}
    </header>
  )
}
