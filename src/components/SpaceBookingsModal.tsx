import { Clock, Mail, Moon, Search, Users, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '../context/ToastContext'
import { HostAnalytics } from './HostAnalytics'
import { LoadingSpinner } from './LoadingSpinner'
import { CANCELLATION_FEE_PERCENT } from '../lib/pricing'
import { supabase } from '../lib/supabaseClient'
import { cancelBooking } from '../lib/stripe'
import { formatPrice } from '../lib/utils'
import type { Booking, Space } from '../types'

interface SpaceBookingsModalProps {
  space: Space | null
  onClose: () => void
}

export function SpaceBookingsModal({ space, onClose }: SpaceBookingsModalProps) {
  const { showToast } = useToast()
  const { t, i18n } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const loadBookings = useCallback(async () => {
    if (!space) return
    setLoading(true)
    const { data } = await supabase
      .from('bookings')
      .select('*, customer:profiles(*)')
      .eq('space_id', space.id)
      .order('check_in', { ascending: false })
    setBookings((data as Booking[]) ?? [])
    setLoading(false)
  }, [space])

  useEffect(() => {
    if (space) {
      loadBookings()
      setQuery('')
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [space, loadBookings])

  const filteredBookings = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter((b) => {
      const code = b.booking_code?.toLowerCase() ?? ''
      const name = b.customer?.full_name?.toLowerCase() ?? ''
      const email = b.customer?.email?.toLowerCase() ?? ''
      return code.includes(q) || name.includes(q) || email.includes(q)
    })
  }, [bookings, query])

  if (!space) return null

  async function handleCancel(booking: Booking) {
    const isPaidStripeBooking = booking.status === 'confirmed' && Boolean(booking.stripe_payment_intent_id)

    if (isPaidStripeBooking) {
      const total = (booking.total_price ?? 0) + (booking.platform_fee_amount ?? 0)
      const feeAmount = Math.round(total * (CANCELLATION_FEE_PERCENT / 100) * 100) / 100
      const refundAmount = Math.round((total - feeAmount) * 100) / 100
      const confirmed = window.confirm(
        t('spaceBookings.confirmCancelPaid', {
          refundPercent: 100 - CANCELLATION_FEE_PERCENT,
          refundAmount: refundAmount.toFixed(2),
          feePercent: CANCELLATION_FEE_PERCENT,
          feeAmount: feeAmount.toFixed(2),
        }),
      )
      if (!confirmed) return
    } else if (!window.confirm(t('spaceBookings.confirmCancelFree'))) {
      return
    }

    setCancellingId(booking.id)
    const result = await cancelBooking(booking.id)
    setCancellingId(null)
    if (result.error) {
      showToast(result.error)
      return
    }
    showToast(t('spaceBookings.bookingCancelled'))
    loadBookings()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative w-full max-w-lg space-y-5 overflow-y-auto rounded-3xl p-6 shadow-2xl transition-all duration-300 max-h-[85vh] ${
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

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">{t('spaceBookings.title')}</h3>
          <p className="text-xs text-ink-muted">{space.title}</p>
        </div>

        <HostAnalytics spaceIds={[space.id]} />

        {!loading && bookings.length > 0 && (
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('spaceBookings.searchPlaceholder')}
              className="w-full rounded-2xl border border-line/10 bg-well/40 py-2.5 pl-9 pr-3.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
        )}

        {loading ? (
          <LoadingSpinner label={t('spaceBookings.loading')} />
        ) : bookings.length === 0 ? (
          <p className="text-xs text-ink-muted">{t('spaceBookings.none')}</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-xs text-ink-muted">{t('spaceBookings.noMatches')}</p>
        ) : (
          <div className="space-y-2">
            {filteredBookings.map((b) => {
              const checkIn = new Date(b.check_in)
              const checkOut = new Date(b.check_out)
              const isNightly = b.booking_type === 'nightly'
              const isCancelled = b.status === 'cancelled'
              const dateFmt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
              const timeFmt: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
              return (
                <div
                  key={b.id}
                  className={`glass-card space-y-2 rounded-2xl p-3.5 text-xs ${isCancelled ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {isNightly ? (
                        <Moon size={13} className="text-accent" />
                      ) : (
                        <Clock size={13} className="text-accent" />
                      )}
                      <span className="font-semibold text-ink">
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
                    {b.total_price != null && <span className="font-bold text-ink">{formatPrice(b.total_price)}</span>}
                  </div>

                  <div className="flex items-center space-x-1.5 text-ink-muted">
                    <Mail size={11} />
                    <span>
                      {b.customer?.full_name || t('spaceBookings.customer')} · {b.customer?.email ?? t('spaceBookings.noEmail')}
                    </span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-ink-muted">
                    <Users size={11} />
                    <span>{t('spaceBookings.guestsCount', { count: b.guests })}</span>
                  </div>

                  {b.booking_code && (
                    <div className="flex items-center justify-between rounded-xl border border-dashed border-indigo-400/30 bg-indigo-500/10 px-2.5 py-1.5">
                      <span className="text-[9px] font-semibold uppercase tracking-wider text-accent">
                        {t('spaceBookings.code')}
                      </span>
                      <span className="font-mono text-xs font-bold tracking-widest text-ink">{b.booking_code}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        isCancelled ? 'bg-gray-500/20 text-ink-muted' : 'bg-emerald-500/15 text-emerald-300'
                      }`}
                    >
                      {isCancelled ? t('spaceBookings.statusCancelled') : t('spaceBookings.statusConfirmed')}
                    </span>
                    {!isCancelled && (
                      <button
                        onClick={() => handleCancel(b)}
                        disabled={cancellingId === b.id}
                        className="text-[11px] font-semibold text-red-300 transition hover:text-red-200 disabled:opacity-60"
                      >
                        {cancellingId === b.id ? t('spaceBookings.cancelling') : t('spaceBookings.cancelBooking')}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
