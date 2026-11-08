import { Copy, Gift, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { referralCodeForUser } from '../lib/referral'
import { StayBotIcon } from './StayBotIcon'

interface WelcomeCarouselProps {
  open: boolean
  isNewUser: boolean
  onClose: () => void
}

export function WelcomeCarousel({ open, isNewUser, onClose }: WelcomeCarouselProps) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { showToast } = useToast()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (open) {
      setStep(0)
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [open])

  if (!open) return null

  const steps = [
    {
      title: isNewUser ? t('welcomeCarousel.newTitle') : t('welcomeCarousel.backTitle'),
      body: isNewUser ? t('welcomeCarousel.newBody') : t('welcomeCarousel.backBody'),
    },
    {
      title: t('welcomeCarousel.referralTitle'),
      body: t('welcomeCarousel.referralBody'),
      action: 'referral' as const,
    },
    {
      title: t('welcomeCarousel.reviewTitle'),
      body: t('welcomeCarousel.reviewBody'),
    },
  ]

  const current = steps[step]
  const isLast = step === steps.length - 1

  function handleCopyReferralLink() {
    if (!user) return
    const link = `${window.location.origin}/?ref=${referralCodeForUser(user.id)}`
    navigator.clipboard
      .writeText(link)
      .then(() => showToast(t('myBookings.referralLinkCopied')))
      .catch(() => showToast(link))
  }

  function handleNext() {
    if (isLast) {
      onClose()
      return
    }
    setStep((s) => s + 1)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative w-full max-w-sm space-y-5 rounded-3xl p-6 text-center shadow-2xl transition-all duration-300 ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-ink-muted transition hover:text-ink"
          aria-label={t('common.close')}
        >
          <X size={16} />
        </button>

        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/10">
          {step === 1 ? (
            <Gift size={28} className="text-accent" />
          ) : step === 2 ? (
            <Star size={28} className="fill-amber-400 text-amber-400" />
          ) : (
            <StayBotIcon className="h-10 w-10" />
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-lg font-bold text-ink">{current.title}</h3>
          <p className="text-xs leading-relaxed text-ink-muted">{current.body}</p>
        </div>

        {current.action === 'referral' && (
          <button
            onClick={handleCopyReferralLink}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl border border-line/10 bg-well/30 py-2.5 text-xs font-semibold text-ink transition hover:bg-well/40"
          >
            <Copy size={12} />
            <span>{t('myBookings.copyReferralLink')}</span>
          </button>
        )}

        <div className="flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-accent' : 'w-1.5 bg-line/20'}`}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="glass-drop shine-sweep w-full rounded-2xl py-3 text-xs font-bold text-ink"
        >
          {isLast ? t('welcomeCarousel.start') : t('welcomeCarousel.next')}
        </button>
      </div>
    </div>
  )
}
