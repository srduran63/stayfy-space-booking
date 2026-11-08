import { BadgeCheck, CalendarClock, CalendarSync, Landmark, LoaderCircle, MapPin, Pencil, Plus, ShieldCheck, Star } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarSyncModal } from '../components/CalendarSyncModal'
import { HostAnalytics } from '../components/HostAnalytics'
import { LoadingSpinner } from '../components/LoadingSpinner'
import { SpaceBookingsModal } from '../components/SpaceBookingsModal'
import { SpaceFormModal } from '../components/SpaceFormModal'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabaseClient'
import { checkConnectStatus, startConnectOnboarding } from '../lib/stripe'
import { categoryLabel, formatPrice } from '../lib/utils'
import type { Space } from '../types'

export function PartnerPanel() {
  const { user, refreshProfile, refreshIsHost } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [spaces, setSpaces] = useState<Space[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingSpace, setEditingSpace] = useState<Space | null>(null)
  const [bookingsSpace, setBookingsSpace] = useState<Space | null>(null)
  const [calendarSpace, setCalendarSpace] = useState<Space | null>(null)

  const [stripeConnected, setStripeConnected] = useState(false)
  const [stripeComplete, setStripeComplete] = useState(false)
  const [checkingStripe, setCheckingStripe] = useState(true)
  const [connecting, setConnecting] = useState(false)

  const loadMySpaces = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data } = await supabase
      .from('spaces')
      .select('*')
      .eq('host_id', user.id)
      .order('created_at', { ascending: false })
    setSpaces((data as Space[]) ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadMySpaces()
  }, [loadMySpaces])

  useEffect(() => {
    checkConnectStatus().then(({ connected, onboardingComplete }) => {
      setStripeConnected(connected)
      setStripeComplete(onboardingComplete)
      setCheckingStripe(false)
      if (onboardingComplete) refreshProfile()
    })
    if (window.location.search.includes('stripe=')) {
      const url = new URL(window.location.href)
      url.searchParams.delete('stripe')
      window.history.replaceState({}, '', url.toString())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleConnectStripe() {
    setConnecting(true)
    const { url, error } = await startConnectOnboarding()
    setConnecting(false)
    if (url) window.location.href = url
    else if (error) showToast(error)
  }

  async function handleSaved() {
    await Promise.all([loadMySpaces(), refreshIsHost()])
  }

  function openCreate() {
    setEditingSpace(null)
    setFormOpen(true)
  }

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-start p-4 pb-20 sm:p-6">
      <div className="w-full space-y-6 animate-fadeIn">
        <div className="flex w-full flex-col items-start justify-between gap-4 border-b border-line/10 pb-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-ink sm:text-3xl">{t('partnerPanel.title')}</h2>
            <p className="mt-1 text-xs text-accent">{t('partnerPanel.subtitle')}</p>
          </div>
          <button
            onClick={openCreate}
            className="glass-drop flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink"
          >
            <Plus size={13} />
            <span>{t('partnerPanel.publishSpace')}</span>
          </button>
        </div>

        <div className="glass-modal flex w-full flex-col items-start justify-between gap-3 rounded-3xl p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="flex items-center space-x-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                stripeComplete ? 'bg-emerald-500/15 text-emerald-300' : 'bg-indigo-500/15 text-accent'
              }`}
            >
              {stripeComplete ? <BadgeCheck size={18} /> : <Landmark size={18} />}
            </div>
            <div>
              <p className="text-sm font-bold text-ink">
                {checkingStripe
                  ? t('partnerPanel.checkingPayments')
                  : stripeComplete
                    ? t('partnerPanel.paymentsConnected')
                    : stripeConnected
                      ? t('partnerPanel.verificationPending')
                      : t('partnerPanel.connectCta')}
              </p>
              <p className="text-[11px] text-ink-muted">
                {stripeComplete ? t('partnerPanel.paymentsConnectedDesc') : t('partnerPanel.connectDesc')}
              </p>
            </div>
          </div>
          {!stripeComplete && !checkingStripe && (
            <button
              onClick={handleConnectStripe}
              disabled={connecting}
              className="glass-drop flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink disabled:opacity-60"
            >
              {connecting && <LoaderCircle size={12} className="animate-spin" />}
              <span>{stripeConnected ? t('partnerPanel.completeVerification') : t('partnerPanel.connectBank')}</span>
            </button>
          )}
        </div>

        <div className="glass-modal flex w-full items-center space-x-3 rounded-3xl p-4 sm:p-5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">{t('partnerPanel.feeModelTitle')}</p>
            <p className="text-[11px] text-ink-muted">{t('partnerPanel.feeModelDesc')}</p>
          </div>
        </div>

        {!loading && spaces.length > 0 && <HostAnalytics spaceIds={spaces.map((s) => s.id)} />}

        {loading ? (
          <LoadingSpinner label={t('partnerPanel.loadingSpaces')} />
        ) : spaces.length === 0 ? (
          <div className="glass-modal w-full rounded-3xl p-8 text-center">
            <p className="text-sm font-semibold text-ink">{t('partnerPanel.noSpaces')}</p>
            <p className="mt-1 text-xs text-ink-muted">{t('partnerPanel.noSpacesDesc')}</p>
            <button
              onClick={openCreate}
              className="glass-drop mx-auto mt-4 flex items-center space-x-2 rounded-2xl px-4 py-2.5 text-xs font-semibold text-ink"
            >
              <Plus size={13} />
              <span>{t('partnerPanel.publishFirstSpace')}</span>
            </button>
          </div>
        ) : (
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {spaces.map((space) => (
              <div key={space.id} className="glass-card flex flex-col overflow-hidden rounded-3xl">
                <div className="relative h-32 w-full overflow-hidden bg-well/30">
                  {space.images[0] ? (
                    <img src={space.images[0]} alt={space.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
                      {t('common.noImage')}
                    </div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur-sm">
                    {categoryLabel(space.category)}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <h3 className="text-sm font-bold text-ink line-clamp-1">{space.title}</h3>
                  <div className="flex items-center space-x-1.5 text-[11px] text-ink-muted">
                    <MapPin size={11} />
                    <span className="line-clamp-1">{space.city}</span>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center space-x-1 text-[11px] text-amber-400">
                      <Star size={11} className="fill-amber-400" />
                      <span>{space.rating.toFixed(1)}</span>
                    </div>
                    <div className="text-xs font-bold text-ink">
                      {formatPrice(space.price_per_hour)}
                      <span className="font-normal text-ink-muted"> {t('common.perHour')}</span>
                    </div>
                  </div>
                  <div className="mt-auto flex flex-col gap-2 pt-3">
                    <button
                      onClick={() => setBookingsSpace(space)}
                      className="flex items-center justify-center space-x-1.5 rounded-xl border border-indigo-400/30 bg-indigo-500/10 py-2 text-[11px] font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                    >
                      <CalendarClock size={11} />
                      <span>{t('partnerPanel.viewBookings')}</span>
                    </button>
                    <button
                      onClick={() => setCalendarSpace(space)}
                      className="flex items-center justify-center space-x-1.5 rounded-xl border border-line/10 bg-line/5 py-2 text-[11px] font-semibold text-ink transition hover:bg-line/10"
                    >
                      <CalendarSync size={11} />
                      <span>{t('partnerPanel.syncCalendars')}</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingSpace(space)
                        setFormOpen(true)
                      }}
                      className="flex items-center justify-center space-x-1.5 rounded-xl border border-line/10 bg-line/5 py-2 text-[11px] font-semibold text-ink transition hover:bg-line/10"
                    >
                      <Pencil size={11} />
                      <span>{t('partnerPanel.edit')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <SpaceFormModal
        open={formOpen}
        space={editingSpace}
        onClose={() => setFormOpen(false)}
        onSaved={handleSaved}
      />
      <SpaceBookingsModal space={bookingsSpace} onClose={() => setBookingsSpace(null)} />
      <CalendarSyncModal space={calendarSpace} onClose={() => setCalendarSpace(null)} />
    </main>
  )
}
