import { Calculator } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SpaceCategory } from '../types'
import { formatPrice } from '../lib/utils'

const CATEGORY_VALUES: SpaceCategory[] = ['hotel', 'estudio', 'oficina', 'evento', 'reunion', 'coworking']

type PriceUnit = 'hour' | 'night'

export function EarningsCalculator() {
  const { t } = useTranslation()
  const [category, setCategory] = useState<SpaceCategory>('hotel')
  const [unit, setUnit] = useState<PriceUnit>('night')
  const [price, setPrice] = useState(80)
  const [availability, setAvailability] = useState(30)
  const [occupancy, setOccupancy] = useState(45)

  function handleUnitChange(next: PriceUnit) {
    setUnit(next)
    setAvailability(next === 'night' ? 30 : 60)
    setPrice(next === 'night' ? 80 : 20)
  }

  const monthlyEarnings = useMemo(
    () => price * availability * (occupancy / 100),
    [price, availability, occupancy],
  )

  return (
    <div className="glass-card grid w-full gap-6 rounded-3xl p-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-10">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-muted">{t('becomeHost.calculatorCategoryLabel')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as SpaceCategory)}
            className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink focus:border-indigo-500 focus:outline-none"
          >
            {CATEGORY_VALUES.map((c) => (
              <option key={c} value={c} className="bg-staydark">
                {t(`categories.${c}`)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-muted">{t('becomeHost.calculatorUnitLabel')}</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleUnitChange('night')}
              className={`flex-1 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition ${
                unit === 'night' ? 'bg-indigo-500 text-white' : 'border border-line/10 bg-well/40 text-ink-muted'
              }`}
            >
              {t('becomeHost.calculatorPerNight')}
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange('hour')}
              className={`flex-1 rounded-2xl px-3.5 py-2.5 text-xs font-semibold transition ${
                unit === 'hour' ? 'bg-indigo-500 text-white' : 'border border-line/10 bg-well/40 text-ink-muted'
              }`}
            >
              {t('becomeHost.calculatorPerHour')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('becomeHost.calculatorPriceLabel')}</label>
            <input
              type="number"
              min={0}
              step="1"
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">
              {unit === 'night' ? t('becomeHost.calculatorAvailabilityNightLabel') : t('becomeHost.calculatorAvailabilityHourLabel')}
            </label>
            <input
              type="number"
              min={0}
              step="1"
              value={availability}
              onChange={(e) => setAvailability(Number(e.target.value) || 0)}
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium text-ink-muted">{t('becomeHost.calculatorOccupancyLabel')}</label>
            <span className="text-xs font-bold text-ink">{occupancy}%</span>
          </div>
          <input
            type="range"
            min={10}
            max={90}
            step="5"
            value={occupancy}
            onChange={(e) => setOccupancy(Number(e.target.value))}
            className="w-full accent-indigo-500"
          />
        </div>
      </div>

      <div className="flex flex-col justify-center space-y-3 rounded-2xl bg-well/10 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-accent">
          <Calculator size={18} />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-ink-faint">
          {t('becomeHost.calculatorResultLabel')}
        </p>
        <p className="text-4xl font-extrabold tracking-tight text-ink">{formatPrice(monthlyEarnings)}</p>
        <p className="text-xs text-ink-faint">
          {t('becomeHost.calculatorBreakdown', {
            price: formatPrice(price),
            units: availability,
            occupancy,
          })}
        </p>
        <p className="border-t border-line/10 pt-3 text-[11px] leading-relaxed text-ink-faint">
          {t('becomeHost.calculatorDisclaimer')}
        </p>
      </div>
    </div>
  )
}
