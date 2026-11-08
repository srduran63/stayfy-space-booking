import { Clock, Moon, Search, SearchX, SlidersHorizontal } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SpaceCard } from '../components/SpaceCard'
import { SpaceDetailModal } from '../components/SpaceDetailModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAdsense } from '../hooks/useAdsense'
import { useFavorites } from '../hooks/useFavorites'
import { isAdminEmail } from '../lib/constants'
import { playPop } from '../lib/sound'
import { supabase } from '../lib/supabaseClient'
import { categoryLabel, formatPrice } from '../lib/utils'
import type { Booking, Space, SpaceCategory } from '../types'

const CATEGORY_VALUES: Array<SpaceCategory | 'todos'> = [
  'todos',
  'hotel',
  'estudio',
  'oficina',
  'reunion',
  'coworking',
  'evento',
]

export function Dashboard() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { t, i18n } = useTranslation()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loadingSpaces, setLoadingSpaces] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<SpaceCategory | 'todos'>('todos')
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')

  useAdsense()
  const [availFrom, setAvailFrom] = useState('')
  const [availTo, setAvailTo] = useState('')
  const [unavailableIds, setUnavailableIds] = useState<Set<string>>(new Set())
  const [checkingAvailability, setCheckingAvailability] = useState(false)

  const loadSpaces = useCallback(async () => {
    setLoadingSpaces(true)
    const { data } = await supabase.from('spaces').select('*').order('created_at', { ascending: false })
    setSpaces((data as Space[]) ?? [])
    setLoadingSpaces(false)
  }, [])

  const loadBookings = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('bookings')
      .select('*, space:spaces(*)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('check_out', new Date().toISOString())
      .order('check_in', { ascending: true })
    setBookings((data as Booking[]) ?? [])
  }, [user])

  useEffect(() => {
    loadSpaces()
  }, [loadSpaces])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (!payment) return
    if (payment === 'success') {
      playPop()
      showToast(t('dashboard.paymentSuccess'))
    } else if (payment === 'cancelled') {
      showToast(t('dashboard.paymentCancelled'))
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('payment')
    url.searchParams.delete('booking_id')
    window.history.replaceState({}, '', url.toString())
    loadBookings()
    if (payment === 'success') setTimeout(loadBookings, 1500)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  useEffect(() => {
    if (!availFrom || !availTo || availTo <= availFrom) {
      setUnavailableIds(new Set())
      return
    }
    let cancelled = false
    setCheckingAvailability(true)
    const fromIso = new Date(`${availFrom}T00:00:00`).toISOString()
    const toIso = new Date(`${availTo}T23:59:59`).toISOString()
    supabase
      .from('bookings')
      .select('space_id')
      .in('status', ['confirmed', 'pending_payment'])
      .lt('check_in', toIso)
      .gt('check_out', fromIso)
      .then(({ data }) => {
        if (cancelled) return
        setUnavailableIds(new Set((data ?? []).map((b) => b.space_id as string)))
        setCheckingAvailability(false)
      })
    return () => {
      cancelled = true
    }
  }, [availFrom, availTo])

  const filteredSpaces = useMemo(() => {
    const min = minPrice.trim() ? Number(minPrice) : null
    const max = maxPrice.trim() ? Number(maxPrice) : null
    const availabilityActive = Boolean(availFrom && availTo && availTo > availFrom)

    return spaces.filter((space) => {
      const matchesCategory = category === 'todos' || space.category === category
      const q = query.trim().toLowerCase()
      const matchesQuery =
        !q || space.title.toLowerCase().includes(q) || space.city.toLowerCase().includes(q)

      const effectivePrice = space.price_per_night ?? space.price_per_hour
      const matchesMin = min == null || effectivePrice >= min
      const matchesMax = max == null || effectivePrice <= max

      const matchesAvailability = !availabilityActive || !unavailableIds.has(space.id)

      return matchesCategory && matchesQuery && matchesMin && matchesMax && matchesAvailability
    })
  }, [spaces, query, category, minPrice, maxPrice, availFrom, availTo, unavailableIds])

  const activeFilterCount = [minPrice, maxPrice, availFrom && availTo ? 'x' : ''].filter(Boolean).length

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-line/10 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">{t('dashboard.welcome')}</h2>
            <p className="mt-1 text-xs text-accent">
              {profile?.full_name
                ? t('dashboard.welcomeSubtitleNamed', { name: profile.full_name })
                : t('dashboard.welcomeSubtitle')}
            </p>
          </div>
          {isAdminEmail(user?.email) && (
            <Link
              to="/mis-espacios"
              className="glass-drop rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink"
            >
              {t('dashboard.publishSpaceCta')}
            </Link>
          )}
        </div>

        {/* Buscador */}
        <div className="glass-modal w-full space-y-3.5 rounded-3xl p-4 sm:p-5">
          <div className="flex w-full flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center space-x-3 rounded-2xl border border-line/10 bg-well/30 px-3.5 py-2.5">
              <Search size={13} className="text-ink-muted" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('dashboard.searchPlaceholder')}
                className="w-full bg-transparent text-xs text-ink focus:outline-none"
              />
            </div>
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex shrink-0 items-center justify-center space-x-2 rounded-2xl border px-3.5 py-2.5 text-xs font-semibold transition ${
                filtersOpen || activeFilterCount > 0
                  ? 'border-indigo-400/40 bg-indigo-500/15 text-ink'
                  : 'border-line/10 bg-well/30 text-ink-muted'
              }`}
            >
              <SlidersHorizontal size={13} />
              <span>
                {t('dashboard.filters')}
                {activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
              </span>
            </button>
          </div>

          <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto px-1 pb-0.5">
            {CATEGORY_VALUES.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                  category === c
                    ? 'bg-indigo-500 text-white'
                    : 'border border-line/10 bg-well/20 text-ink-muted hover:text-ink'
                }`}
              >
                {c === 'todos' ? t('categories.all') : categoryLabel(c)}
              </button>
            ))}
          </div>

          {filtersOpen && (
            <div className="grid grid-cols-1 gap-3 border-t border-line/10 pt-3 sm:grid-cols-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('dashboard.minPrice')}</label>
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  className="w-full rounded-xl border border-line/10 bg-well/40 px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('dashboard.maxPrice')}</label>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder={t('dashboard.noLimit')}
                  className="w-full rounded-xl border border-line/10 bg-well/40 px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('dashboard.availableFrom')}</label>
                <input
                  type="date"
                  value={availFrom}
                  onChange={(e) => setAvailFrom(e.target.value)}
                  className="w-full rounded-xl border border-line/10 bg-well/40 px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('dashboard.availableTo')}</label>
                <input
                  type="date"
                  value={availTo}
                  onChange={(e) => setAvailTo(e.target.value)}
                  className="w-full rounded-xl border border-line/10 bg-well/40 px-3 py-2 text-xs text-ink focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {checkingAvailability && (
                <p className="col-span-full text-[11px] text-ink-muted">{t('dashboard.checkingAvailability')}</p>
              )}
              {(minPrice || maxPrice || availFrom || availTo) && (
                <button
                  onClick={() => {
                    setMinPrice('')
                    setMaxPrice('')
                    setAvailFrom('')
                    setAvailTo('')
                  }}
                  className="col-span-full text-left text-[11px] font-semibold text-accent hover:text-indigo-200"
                >
                  {t('dashboard.clearFilters')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Próximas reservas */}
        {bookings.length > 0 && (
          <div className="w-full space-y-3">
            <h3 className="text-sm font-bold text-ink">{t('dashboard.myUpcomingBookings')}</h3>
            <div className="flex w-full flex-col gap-2">
              {bookings.map((b) => {
                const checkIn = new Date(b.check_in)
                const checkOut = new Date(b.check_out)
                const isNightly = b.booking_type === 'nightly'
                const dateFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
                const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
                return (
                  <div
                    key={b.id}
                    className="glass-card flex items-center justify-between rounded-2xl px-4 py-3 text-xs"
                  >
                    <div className="flex items-center space-x-3">
                      {isNightly ? (
                        <Moon size={14} className="text-accent" />
                      ) : (
                        <Clock size={14} className="text-accent" />
                      )}
                      <div>
                        <p className="font-semibold text-ink">{b.space?.title ?? t('dashboard.space')}</p>
                        <p className="text-[11px] text-ink-muted">
                          {isNightly ? (
                            <>
                              {checkIn.toLocaleDateString(i18n.language, dateFmt)} →{' '}
                              {checkOut.toLocaleDateString(i18n.language, dateFmt)}
                            </>
                          ) : (
                            <>
                              {checkIn.toLocaleDateString(i18n.language, dateFmt)} ·{' '}
                              {checkIn.toLocaleTimeString(i18n.language, timeFmt)}–
                              {checkOut.toLocaleTimeString(i18n.language, timeFmt)}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    {b.total_price != null && (
                      <span className="font-semibold text-ink">{formatPrice(b.total_price)}</span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Listado de espacios */}
        <div className="w-full space-y-3">
          <h3 className="text-sm font-bold text-ink">
            {t('dashboard.availableSpaces')}
            {!loadingSpaces && filteredSpaces.length > 0 && (
              <span className="ml-1.5 font-normal text-ink-faint">({filteredSpaces.length})</span>
            )}
          </h3>
          {loadingSpaces ? (
            <LoadingSpinner label={t('dashboard.loadingSpaces')} />
          ) : filteredSpaces.length === 0 ? (
            <div className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-line/15 py-14 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-well/15 text-ink-faint">
                <SearchX size={20} />
              </div>
              <p className="text-sm font-semibold text-ink">{t('dashboard.noSpacesFoundTitle')}</p>
              <p className="max-w-xs text-xs text-ink-muted">
                {t('dashboard.noSpacesFound', {
                  query: query ? t('dashboard.forQuery', { query }) : '',
                  category: category !== 'todos' ? t('dashboard.inCategory', { category: categoryLabel(category) }) : '',
                })}
              </p>
              {(query || category !== 'todos') && (
                <button
                  onClick={() => {
                    setQuery('')
                    setCategory('todos')
                  }}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  {t('dashboard.clearSearch')}
                </button>
              )}
            </div>
          ) : (
            <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredSpaces.map((space, i) => (
                <div key={space.id} className="animate-fadeIn" style={{ animationDelay: `${Math.min(i, 8) * 60}ms`, animationFillMode: 'backwards' }}>
                  <SpaceCard
                    space={space}
                    onSelect={setSelectedSpace}
                    isFavorite={isFavorite(space.id)}
                    onToggleFavorite={toggleFavorite}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <SpaceDetailModal space={selectedSpace} onClose={() => setSelectedSpace(null)} onBooked={loadBookings} />
    </main>
  )
}
