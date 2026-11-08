import { useTranslation } from 'react-i18next'
import { useRegion } from '../context/RegionContext'

interface RegionSwitcherProps {
  variant?: 'compact' | 'full'
}

export function RegionSwitcher({ variant = 'compact' }: RegionSwitcherProps) {
  const { t } = useTranslation()
  const { region, setRegion } = useRegion()

  function toggle() {
    setRegion(region === 'CO' ? 'GLOBAL' : 'CO')
  }

  const label = region === 'CO' ? `🇨🇴 ${t('region.co')}` : `🌎 ${t('region.global')}`

  if (variant === 'compact') {
    return (
      <button
        onClick={toggle}
        className="flex h-8 items-center gap-1.5 rounded-full border border-line/20 bg-well/30 px-2.5 text-[11px] font-semibold text-ink transition hover:scale-105"
        aria-label={t('region.switchAria')}
        title={t('region.switchAria')}
      >
        <span>{region === 'CO' ? '🇨🇴' : '🌎'}</span>
        <span className="hidden sm:inline">{region === 'CO' ? 'COP' : 'USD'}</span>
      </button>
    )
  }

  return (
    <button
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition hover:border-line/25"
    >
      <span>{label}</span>
      <span className="text-ink-faint">{region === 'CO' ? 'COP' : 'USD'}</span>
    </button>
  )
}
