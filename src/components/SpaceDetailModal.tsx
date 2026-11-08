import { ArrowRight, Calendar, Clock, Heart, LoaderCircle, MapPin, Minus, Moon, Plus, Star, Users, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useRegion } from '../context/RegionContext'
import { useFavorites } from '../hooks/useFavorites'
import { amenityInfo } from '../lib/amenities'
import { supabase } from '../lib/supabaseClient'
import { createCheckoutSession } from '../lib/stripe'
import { serviceFeePercentFor } from '../lib/pricing'
import { playPop } from '../lib/sound'
import { categoryLabel, formatPrice } from '../lib/utils'
import { useToast } from '../context/ToastContext'
import type { Review, Space } from '../types'

interface SpaceDetailModalProps {
  space: Space | null
  onClose: () => void
  onBooked: () => void
}

type BookingTab = 'hourly' | 'nightly'

const NIGHTLY_CHECK_IN_TIME = '15:00'
const NIGHTLY_CHECK_OUT_TIME = '11:00'

function todayIso(): string {
  return new Date().toISOString().split('T')[0]
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function SpaceDetailModal({ space, onClose, onBooked }: SpaceDetailModalProps) {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const { region } = useRegion()
  const { isFavorite, toggleFavorite } = useFavorites()
  const [visible, setVisible] = useState(false)
  const [activeImage, setActiveImage] = useState(0)
  const [tab, setTab] = useState<BookingTab>('hourly')

  // Por horas
  const [date, setDate] = useState(todayIso())
  const [startTime, setStartTime] = useState('10:00')
  const [endTime, setEndTime] = useState('12:00')

  // Por noches
  const [checkInDate, setCheckInDate] = useState(todayIso())
  const [checkOutDate, setCheckOutDate] = useState(addDaysIso(todayIso(), 1))

  const [guests, setGuests] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [reviews, setReviews] = useState<Review[]>([])
  const [termsAccepted, setTermsAccepted] = useState(false)

  useEffect(() => {
    if (space) {
      const today = todayIso()
      setDate(today)
      setStartTime('10:00')
      setEndTime('12:00')
      setCheckInDate(today)
      setCheckOutDate(addDaysIso(today, 1))
      setActiveImage(0)
      setTab(space.price_per_night != null ? 'nightly' : 'hourly')
      setGuests(1)
      setTermsAccepted(false)
      const t = setTimeout(() => setVisible(true), 10)

      supabase
        .from('reviews')
        .select('*, author:profiles(*)')
        .eq('space_id', space.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => setReviews((data as Review[]) ?? []))

      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [space])

  const hourlyHours = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number)
    const [eh, em] = endTime.split(':').map(Number)
    const diff = eh * 60 + em - (sh * 60 + sm)
    return diff / 60
  }, [startTime, endTime])

  const nightlyNights = useMemo(() => {
    const inD = new Date(`${checkInDate}T00:00:00`)
    const outD = new Date(`${checkOutDate}T00:00:00`)
    return Math.round((outD.getTime() - inD.getTime()) / (1000 * 60 * 60 * 24))
  }, [checkInDate, checkOutDate])

  const isHourlyValid = hourlyHours > 0
  const isNightlyValid = nightlyNights >= 1

  const range = useMemo(() => {
    if (tab === 'hourly') {
      if (!isHourlyValid) return null
      return {
        checkIn: new Date(`${date}T${startTime}:00`).toISOString(),
        checkOut: new Date(`${date}T${endTime}:00`).toISOString(),
      }
    }
    if (!isNightlyValid) return null
    return {
      checkIn: new Date(`${checkInDate}T${NIGHTLY_CHECK_IN_TIME}:00`).toISOString(),
      checkOut: new Date(`${checkOutDate}T${NIGHTLY_CHECK_OUT_TIME}:00`).toISOString(),
    }
  }, [tab, date, startTime, endTime, checkInDate, checkOutDate, isHourlyValid, isNightlyValid])

  const [checkingAvailability, setCheckingAvailability] = useState(false)
  const [hasConflict, setHasConflict] = useState(false)

  useEffect(() => {
    if (!space || !range) {
      setHasConflict(false)
      return
    }
    let cancelled = false
    setCheckingAvailability(true)
    const t = setTimeout(async () => {
      const checkInOnly = range.checkIn.slice(0, 10)
      const checkOutOnly = range.checkOut.slice(0, 10)
      // Para reservas por hora, checkIn y checkOut caen en el mismo día: el bloqueo
      // de calendario externo cubre ese día completo, así que el límite exclusivo es el día siguiente.
      const blockedRangeEndExclusive = tab === 'hourly' ? addDaysIso(checkInOnly, 1) : checkOutOnly

      const [bookingsResult, blockedResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('id')
          .eq('space_id', space.id)
          .in('status', ['confirmed', 'pending_payment'])
          .lt('check_in', range.checkOut)
          .gt('check_out', range.checkIn)
          .limit(1),
        supabase
          .from('blocked_dates')
          .select('id')
          .eq('space_id', space.id)
          .lt('start_date', blockedRangeEndExclusive)
          .gt('end_date', checkInOnly)
          .limit(1),
      ])
      if (!cancelled) {
        setHasConflict((bookingsResult.data?.length ?? 0) > 0 || (blockedResult.data?.length ?? 0) > 0)
        setCheckingAvailability(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [space, range, tab])

  if (!space) return null

  const maxGuests = space.capacity ?? 20
  const hasNightlyOption = space.price_per_night != null

  const totalPrice =
    tab === 'hourly'
      ? isHourlyValid
        ? space.price_per_hour * hourlyHours
        : 0
      : isNightlyValid && space.price_per_night != null
        ? space.price_per_night * nightlyNights
        : 0

  const serviceFeePercent = serviceFeePercentFor(profile)
  const serviceFee = space.host_stripe_ready ? totalPrice * (serviceFeePercent / 100) : 0
  const payableTotal = totalPrice + serviceFee

  async function handleBook() {
    if (!user) {
      showToast(t('spaceDetail.loginToBook'))
      return
    }
    if (!range) {
      showToast(
        tab === 'hourly' ? t('spaceDetail.checkOutAfterCheckInToast') : t('spaceDetail.checkOutAfterCheckInDateToast'),
      )
      return
    }
    if (hasConflict) {
      showToast(t('spaceDetail.conflictToast'))
      return
    }
    if (!termsAccepted) {
      showToast(t('spaceDetail.mustAcceptTermsToast'))
      return
    }

    setSubmitting(true)
    const payingWithStripe = space!.host_stripe_ready

    const { data: inserted, error } = await supabase
      .from('bookings')
      .insert({
        space_id: space!.id,
        user_id: user.id,
        booking_type: tab,
        check_in: range.checkIn,
        check_out: range.checkOut,
        guests,
        total_price: totalPrice,
        terms_accepted_at: new Date().toISOString(),
        status: payingWithStripe ? 'pending_payment' : 'confirmed',
      })
      .select('id')
      .single()

    if (error) {
      setSubmitting(false)
      if (error.code === '23P01') {
        setHasConflict(true)
        showToast(t('spaceDetail.conflictJustHappenedToast'))
        return
      }
      showToast(error.message)
      return
    }

    if (!payingWithStripe) {
      setSubmitting(false)
      playPop()
      showToast(t('spaceDetail.bookingConfirmedToast'))
      onBooked()
      onClose()
      return
    }

    const { url, error: checkoutError } = await createCheckoutSession(inserted.id)
    setSubmitting(false)
    if (checkoutError || !url) {
      showToast(checkoutError ?? t('spaceDetail.paymentStartFailedToast'))
      return
    }
    window.location.href = url
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all duration-300 max-h-[90vh] ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 text-ink-muted transition hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>
        {user && (
          <button
            onClick={() => toggleFavorite(space.id)}
            className="absolute right-12 top-4 z-10 text-ink-muted transition hover:text-rose-400"
            aria-label={isFavorite(space.id) ? t('common.removeFromFavorites') : t('common.addToFavorites')}
          >
            <Heart size={16} className={isFavorite(space.id) ? 'fill-rose-500 text-rose-500' : ''} />
          </button>
        )}

        {/* Galería */}
        <div className="space-y-2">
          <div className="h-52 w-full overflow-hidden rounded-2xl bg-well/30">
            {space.images[activeImage] ? (
              <img src={space.images[activeImage]} alt={space.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
                {t('common.noImage')}
              </div>
            )}
          </div>
          {space.images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {space.images.map((url, i) => (
                <button
                  key={url}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition ${
                    i === activeImage ? 'border-indigo-400' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
            {categoryLabel(space.category)}
          </span>
          <h3 className="text-lg font-bold text-ink">{space.title}</h3>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs text-ink-muted">
              <MapPin size={12} />
              <span>{space.address ? `${space.address}, ${space.city}` : space.city}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs text-amber-400">
              {space.review_count > 0 ? (
                <>
                  <Star size={12} className="fill-amber-400" />
                  <span>
                    {space.rating.toFixed(1)} <span className="text-ink-faint">({space.review_count})</span>
                  </span>
                </>
              ) : (
                <span className="text-ink-faint">{t('spaceDetail.noReviewsYet')}</span>
              )}
            </div>
          </div>
          {space.description && <p className="pt-1 text-xs leading-relaxed text-ink-muted">{space.description}</p>}
        </div>

        {/* Amenidades */}
        {space.amenities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink">{t('spaceDetail.whatIncludes')}</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {space.amenities.map((key) => {
                const { icon: Icon, label } = amenityInfo(key)
                return (
                  <div
                    key={key}
                    className="flex items-center space-x-2 rounded-xl border border-line/10 bg-well/20 px-2.5 py-1.5 text-[11px] text-ink-muted"
                  >
                    <Icon size={13} className="text-accent" />
                    <span>{label}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Videos */}
        {space.videos.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink">{t('spaceDetail.video')}</h4>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {space.videos.map((url) => (
                <video key={url} src={url} controls className="h-40 w-64 shrink-0 rounded-xl bg-black" />
              ))}
            </div>
          </div>
        )}

        {/* Reseñas */}
        {reviews.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-ink">
              {t('spaceDetail.reviews')} <span className="text-ink-faint">({reviews.length})</span>
            </h4>
            <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
              {reviews.map((r) => (
                <div key={r.id} className="rounded-xl border border-line/10 bg-well/20 p-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-ink">{r.author?.full_name || t('spaceDetail.guest')}</span>
                    <div className="flex items-center space-x-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} size={10} className={i < r.rating ? 'fill-amber-400' : 'text-ink-faint'} />
                      ))}
                    </div>
                  </div>
                  {r.comment && <p className="mt-1 text-ink-muted">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reserva */}
        <div className="space-y-3 rounded-2xl border border-line/10 bg-well/30 p-4">
          {hasNightlyOption && (
            <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-well/40 p-1">
              <button
                type="button"
                onClick={() => setTab('nightly')}
                className={`flex items-center justify-center space-x-1.5 rounded-lg py-2 text-[11px] font-semibold transition ${
                  tab === 'nightly' ? 'bg-indigo-500/30 text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Moon size={12} />
                <span>{t('spaceDetail.byNight')}</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('hourly')}
                className={`flex items-center justify-center space-x-1.5 rounded-lg py-2 text-[11px] font-semibold transition ${
                  tab === 'hourly' ? 'bg-indigo-500/30 text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                <Clock size={12} />
                <span>{t('spaceDetail.byHour')}</span>
              </button>
            </div>
          )}

          {tab === 'hourly' ? (
            <>
              <div className="overflow-hidden rounded-2xl border border-line/10 bg-well/40">
                <div className="space-y-1 border-b border-line/10 px-3.5 py-2.5">
                  <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                    <Calendar size={11} className="text-accent" />
                    <span>{t('spaceDetail.date')}</span>
                  </label>
                  <input
                    type="date"
                    min={todayIso()}
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <div className="space-y-1 px-3.5 py-2.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      <Clock size={11} className="text-accent" />
                      <span>{t('spaceDetail.checkInTime')}</span>
                    </label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex h-full items-center px-1 text-ink-faint">
                    <ArrowRight size={14} />
                  </div>
                  <div className="space-y-1 border-l border-line/10 px-3.5 py-2.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      <Clock size={11} className="text-accent" />
                      <span>{t('spaceDetail.checkOutTime')}</span>
                    </label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
              {!isHourlyValid && (
                <p className="text-[11px] text-red-300">{t('spaceDetail.checkOutAfterCheckIn')}</p>
              )}
              {isHourlyValid && (
                <p className="text-[11px] text-ink-muted">
                  {t('spaceDetail.hoursOfBooking', { count: hourlyHours })}
                </p>
              )}
            </>
          ) : (
            <>
              <div className="overflow-hidden rounded-2xl border border-line/10 bg-well/40">
                <div className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <div className="space-y-1 px-3.5 py-2.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      <Calendar size={11} className="text-accent" />
                      <span>{t('spaceDetail.checkIn')}</span>
                    </label>
                    <input
                      type="date"
                      min={todayIso()}
                      value={checkInDate}
                      onChange={(e) => {
                        setCheckInDate(e.target.value)
                        if (checkOutDate <= e.target.value) setCheckOutDate(addDaysIso(e.target.value, 1))
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                  <div className="flex h-full items-center px-1 text-ink-faint">
                    <ArrowRight size={14} />
                  </div>
                  <div className="space-y-1 border-l border-line/10 px-3.5 py-2.5">
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
                      <Calendar size={11} className="text-accent" />
                      <span>{t('spaceDetail.checkOut')}</span>
                    </label>
                    <input
                      type="date"
                      min={addDaysIso(checkInDate, 1)}
                      value={checkOutDate}
                      onChange={(e) => setCheckOutDate(e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold text-ink focus:outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-ink-muted">
                {t('spaceDetail.checkInOutSummary', {
                  checkIn: NIGHTLY_CHECK_IN_TIME,
                  checkOut: NIGHTLY_CHECK_OUT_TIME,
                })}
                {isNightlyValid && t('spaceDetail.nightsCount', { count: nightlyNights })}
              </p>
            </>
          )}

          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-medium text-ink-muted">
              <Users size={12} className="text-accent" />
              <span>{t('spaceDetail.guests')}</span>
            </label>
            <div className="flex items-center justify-between rounded-xl border border-line/10 bg-well/40 px-3 py-1.5">
              <button
                type="button"
                onClick={() => setGuests((g) => Math.max(1, g - 1))}
                disabled={guests <= 1}
                aria-label={t('spaceDetail.decreaseGuests')}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-line/10 text-ink transition hover:bg-line/20 disabled:opacity-30"
              >
                <Minus size={12} />
              </button>
              <span className="text-sm font-bold text-ink">{guests}</span>
              <button
                type="button"
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                disabled={guests >= maxGuests}
                aria-label={t('spaceDetail.increaseGuests')}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-line/10 text-ink transition hover:bg-line/20 disabled:opacity-30"
              >
                <Plus size={12} />
              </button>
            </div>
            {space.capacity != null && (
              <p className="text-[10.5px] text-ink-faint">{t('spaceDetail.maxGuests', { count: space.capacity })}</p>
            )}
          </div>

          {hasConflict && (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] text-red-300">
              {t('spaceDetail.conflictNotice')}
            </p>
          )}

          <div className="space-y-1 border-t border-line/10 pt-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ink-muted">{t('spaceDetail.subtotal')}</span>
              <span className="text-ink">{formatPrice(totalPrice)}</span>
            </div>
            {space.host_stripe_ready && (
              <div className="flex items-center justify-between">
                <span className="text-ink-muted">
                  {t('spaceDetail.serviceFee', { percent: serviceFeePercent })}
                  {serviceFeePercent < 10 && (
                    <span className="ml-1 text-emerald-300">{t('spaceDetail.referralDiscountBadge')}</span>
                  )}
                </span>
                <span className="text-ink">{formatPrice(serviceFee)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-1">
              <span className="font-semibold text-ink-muted">{t('spaceDetail.totalToPay')}</span>
              <span className="text-base font-bold text-ink">
                {formatPrice(space.host_stripe_ready ? payableTotal : totalPrice)}
              </span>
            </div>
          </div>

          {space.host_stripe_ready ? (
            <>
              {/* Ejemplo de ramificación por región: los métodos de pago locales (Wompi/PSE/Nequi)
                  todavía no están conectados, así que solo se anuncian — el cobro real sigue
                  ocurriendo con Stripe (única pasarela conectada hoy) para cualquier región. */}
              {region === 'CO' && (
                <p className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-[11px] text-indigo-200">
                  {t('spaceDetail.localPaymentComingSoon')}
                </p>
              )}
              <p className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-[11px] text-emerald-200">
                {t('spaceDetail.stripeNotice')}
              </p>
            </>
          ) : (
            <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-200">
              {t('spaceDetail.directPaymentNotice')}
            </p>
          )}

          <label className="flex items-start space-x-2 text-[11px] text-ink-muted">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-indigo-500"
            />
            <span>
              {t('spaceDetail.acceptTerms')}{' '}
              <Link to="/terminos" target="_blank" className="text-accent hover:underline">
                {t('spaceDetail.termsLink')}
              </Link>
              {t('spaceDetail.acceptTermsSuffix')}
            </span>
          </label>
        </div>

        <button
          onClick={handleBook}
          disabled={submitting || checkingAvailability || hasConflict || !range || !termsAccepted}
          className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-3 text-xs font-bold text-ink disabled:opacity-60"
        >
          {(submitting || checkingAvailability) && <LoaderCircle size={13} className="animate-spin" />}
          <span>
            {submitting
              ? space.host_stripe_ready
                ? t('spaceDetail.redirectingToPayment')
                : t('spaceDetail.booking')
              : checkingAvailability
                ? t('dashboard.checkingAvailability')
                : hasConflict
                  ? t('spaceDetail.notAvailable')
                  : space.host_stripe_ready
                    ? t('spaceDetail.goToPay')
                    : t('spaceDetail.confirmBooking')}
          </span>
        </button>
      </div>
    </div>
  )
}
