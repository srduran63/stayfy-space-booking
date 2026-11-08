import { CalendarX, Clock, Copy, Gift, MapPin, Moon, Star, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { ReviewModal } from '../components/ReviewModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { CANCELLATION_FEE_PERCENT } from '../lib/pricing'
import { referralCodeForUser } from '../lib/referral'
import { supabase } from '../lib/supabaseClient'
import { cancelBooking, createCheckoutSession } from '../lib/stripe'
import { categoryLabel, formatPrice } from '../lib/utils'
import type { Booking } from '../types'

type Filter = 'upcoming' | 'past' | 'cancelled'

export function MyBookings() {
  const { user, profile } = useAuth()
  const { showToast } = useToast()
  const { t, i18n } = useTranslation()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [reviewedBookingIds, setReviewedBookingIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [reviewingBooking, setReviewingBooking] = useState<Booking | null>(null)
  const [resumingId, setResumingId] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [{ data: bookingsData }, { data: reviewsData }] = await Promise.all([
      supabase.from('bookings').select('*, space:spaces(*)').eq('user_id', user.id).order('check_in', { ascending: false }),
      supabase.from('reviews').select('booking_id').eq('user_id', user.id),
    ])
    setBookings((bookingsData as Booking[]) ?? [])
    setReviewedBookingIds(new Set((reviewsData ?? []).map((r) => r.booking_id as string)))
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadBookings()
  }, [loadBookings])

  async function handleCancel(booking: Booking) {
    const isPaidStripeBooking = booking.status === 'confirmed' && Boolean(booking.stripe_payment_intent_id)

    if (isPaidStripeBooking) {
      const total = (booking.total_price ?? 0) + (booking.platform_fee_amount ?? 0)
      const feeAmount = Math.round(total * (CANCELLATION_FEE_PERCENT / 100) * 100) / 100
      const refundAmount = Math.round((total - feeAmount) * 100) / 100
      const confirmed = window.confirm(
        t('myBookings.confirmCancelPaid', {
          refundPercent: 100 - CANCELLATION_FEE_PERCENT,
          refundAmount: refundAmount.toFixed(2),
          feePercent: CANCELLATION_FEE_PERCENT,
          feeAmount: feeAmount.toFixed(2),
        }),
      )
      if (!confirmed) return
    } else if (!window.confirm(t('myBookings.confirmCancelFree'))) {
      return
    }

    setCancellingId(booking.id)
    const result = await cancelBooking(booking.id)
    setCancellingId(null)
    if (result.error) {
      showToast(result.error)
      return
    }
    if (result.refunded && result.refundedAmount != null) {
      showToast(t('myBookings.bookingCancelledRefunded', { amount: result.refundedAmount.toFixed(2) }))
    } else {
      showToast(t('myBookings.bookingCancelled'))
    }
    loadBookings()
  }

  async function handleResumePayment(bookingId: string) {
    setResumingId(bookingId)
    const { url, error } = await createCheckoutSession(bookingId)
    setResumingId(null)
    if (error || !url) {
      showToast(error ?? t('myBookings.resumePaymentFailed'))
      return
    }
    window.location.href = url
  }

  const now = Date.now()
  const filtered = bookings.filter((b) => {
    if (filter === 'cancelled') return b.status === 'cancelled'
    if (b.status === 'cancelled') return false
    const isPast = new Date(b.check_out).getTime() < now
    return filter === 'past' ? isPast : !isPast
  })

  const emptyMessage =
    filter === 'upcoming' ? t('myBookings.noneUpcoming') : filter === 'past' ? t('myBookings.nonePast') : t('myBookings.noneCancelled')

  const hasWelcomeDiscount = Boolean(profile?.referred_by && !profile?.referral_discount_used)

  function handleCopyReferralLink() {
    if (!user) return
    const link = `${window.location.origin}/?ref=${referralCodeForUser(user.id)}`
    navigator.clipboard
      .writeText(link)
      .then(() => showToast(t('myBookings.referralLinkCopied')))
      .catch(() => showToast(link))
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="w-full border-b border-line/10 pb-4">
          <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">{t('myBookings.title')}</h2>
          <p className="mt-1 text-xs text-accent">{t('myBookings.subtitle')}</p>
        </div>

        {hasWelcomeDiscount && (
          <p className="w-full rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-[11px] text-emerald-200">
            {t('myBookings.welcomeDiscountBanner')}
          </p>
        )}

        {profile?.review_discount_available && (
          <p className="w-full rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-2.5 text-[11px] text-amber-200">
            {t('myBookings.reviewDiscountBanner')}
          </p>
        )}

        <div className="glass-modal flex w-full flex-col items-start justify-between gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-300">
              <Gift size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-ink">{t('myBookings.referralTitle')}</p>
              <p className="text-[11px] text-ink-muted">{t('myBookings.referralDesc')}</p>
            </div>
          </div>
          <button
            onClick={handleCopyReferralLink}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl border border-line/10 bg-well/30 py-2.5 text-xs font-semibold text-ink transition hover:bg-well/40 sm:w-auto sm:px-4"
          >
            <Copy size={12} />
            <span>{t('myBookings.copyReferralLink')}</span>
          </button>
        </div>

        <div className="flex gap-2 rounded-2xl bg-well/30 p-1">
          {(
            [
              { value: 'upcoming', label: t('myBookings.upcoming') },
              { value: 'past', label: t('myBookings.past') },
              { value: 'cancelled', label: t('myBookings.cancelled') },
            ] as Array<{ value: Filter; label: string }>
          ).map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`flex-1 rounded-xl py-2 text-xs font-semibold transition ${
                filter === f.value ? 'bg-indigo-500/30 text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <LoadingSpinner label={t('myBookings.loading')} />
        ) : filtered.length === 0 ? (
          <div className="flex w-full flex-col items-center gap-3 rounded-3xl border border-dashed border-line/15 py-14 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-well/15 text-ink-faint">
              <CalendarX size={20} />
            </div>
            <p className="text-xs text-ink-muted">{emptyMessage}</p>
            {filter === 'upcoming' && (
              <Link to="/dashboard" className="text-xs font-semibold text-accent hover:underline">
                {t('myBookings.browseSpaces')}
              </Link>
            )}
          </div>
        ) : (
          <div className="flex w-full flex-col gap-3">
            {filtered.map((b) => {
              const checkIn = new Date(b.check_in)
              const checkOut = new Date(b.check_out)
              const isNightly = b.booking_type === 'nightly'
              const isPast = checkOut.getTime() < now
              const isCancelled = b.status === 'cancelled'
              const isPending = b.status === 'pending_payment'
              const dateFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
              const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
              return (
                <div key={b.id} className="glass-card w-full space-y-3 rounded-2xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-well/30">
                        {b.space?.images[0] ? (
                          <img src={b.space.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-ink">{b.space?.title ?? t('myBookings.space')}</p>
                        {b.space && (
                          <div className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                            <MapPin size={10} />
                            <span>{b.space.city}</span>
                            <span>· {categoryLabel(b.space.category)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    {b.total_price != null && (
                      <span className="text-sm font-bold text-ink">
                        {formatPrice(b.total_price + (b.platform_fee_amount ?? 0))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-ink-muted">
                    {isNightly ? <Moon size={12} className="text-accent" /> : <Clock size={12} className="text-accent" />}
                    <span>
                      {isNightly ? (
                        <>
                          {checkIn.toLocaleDateString(i18n.language, dateFmt)} → {checkOut.toLocaleDateString(i18n.language, dateFmt)}
                        </>
                      ) : (
                        <>
                          {checkIn.toLocaleDateString(i18n.language, dateFmt)} · {checkIn.toLocaleTimeString(i18n.language, timeFmt)}–
                          {checkOut.toLocaleTimeString(i18n.language, timeFmt)}
                        </>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-xs text-ink-muted">
                    <Users size={12} className="text-accent" />
                    <span>{t('myBookings.guestsCount', { count: b.guests })}</span>
                  </div>

                  {b.booking_code && !isCancelled && (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/10 px-3 py-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-accent">
                        {t('myBookings.bookingCode')}
                      </span>
                      <span className="font-mono text-sm font-bold tracking-widest text-ink">{b.booking_code}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCancelled
                          ? 'bg-gray-500/20 text-ink-muted'
                          : isPending
                            ? 'bg-amber-500/15 text-amber-300'
                            : isPast
                              ? 'bg-line/10 text-ink-muted'
                              : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {isCancelled
                        ? t('myBookings.statusCancelled')
                        : isPending
                          ? t('myBookings.statusPending')
                          : isPast
                            ? t('myBookings.statusCompleted')
                            : t('myBookings.statusConfirmed')}
                    </span>
                    {isPending && (
                      <button
                        onClick={() => handleResumePayment(b.id)}
                        disabled={resumingId === b.id}
                        className="text-[11px] font-semibold text-accent transition hover:text-indigo-200 disabled:opacity-60"
                      >
                        {resumingId === b.id ? t('myBookings.resuming') : t('myBookings.completePayment')}
                      </button>
                    )}
                    {!isCancelled && !isPending && !isPast && (
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={cancellingId === b.id}
                        className="text-[11px] font-semibold text-red-300 transition hover:text-red-200 disabled:opacity-60"
                      >
                        {cancellingId === b.id ? t('myBookings.cancelling') : t('myBookings.cancelBooking')}
                      </button>
                    )}
                    {!isCancelled && !isPending && isPast && (
                      reviewedBookingIds.has(b.id) ? (
                        <span className="flex items-center space-x-1 text-[11px] font-semibold text-amber-300">
                          <Star size={11} className="fill-amber-300" />
                          <span>{t('myBookings.alreadyReviewed')}</span>
                        </span>
                      ) : (
                        <button
                          onClick={() => setReviewingBooking(b)}
                          className="flex items-center space-x-1 text-[11px] font-semibold text-accent transition hover:text-indigo-200"
                        >
                          <Star size={11} />
                          <span>{t('myBookings.leaveReview')}</span>
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <ReviewModal
        booking={reviewingBooking}
        onClose={() => setReviewingBooking(null)}
        onSaved={loadBookings}
      />
    </main>
  )
}
