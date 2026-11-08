import { LoaderCircle, Star, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabaseClient'
import type { Booking } from '../types'

interface ReviewModalProps {
  booking: Booking | null
  onClose: () => void
  onSaved: () => void
}

export function ReviewModal({ booking, onClose, onSaved }: ReviewModalProps) {
  const { user, profile, refreshProfile } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  const [rating, setRating] = useState(5)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (booking) {
      setRating(5)
      setHoverRating(0)
      setComment('')
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [booking])

  if (!booking) return null

  async function handleSubmit() {
    if (!user) return
    setSubmitting(true)
    const { error } = await supabase.from('reviews').insert({
      space_id: booking!.space_id,
      user_id: user.id,
      booking_id: booking!.id,
      rating,
      comment: comment.trim() || null,
    })
    if (error) {
      setSubmitting(false)
      showToast(error.message)
      return
    }

    const alreadyHasDiscount = Boolean(profile?.review_discount_available)
    if (!alreadyHasDiscount) {
      await supabase.from('profiles').update({ review_discount_available: true }).eq('id', user.id)
      await refreshProfile()
    }
    setSubmitting(false)
    showToast(alreadyHasDiscount ? t('review.thanks') : t('review.thanksWithDiscount'))
    onSaved()
    onClose()
  }

  const displayRating = hoverRating || rating

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300">
      <div
        className={`glass-modal relative w-full max-w-sm space-y-5 rounded-3xl p-6 shadow-2xl transition-all duration-300 ${
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

        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">{t('review.title')}</h3>
          <p className="text-xs text-ink-muted">{booking.space?.title ?? t('review.yourStay')}</p>
        </div>

        <div className="flex justify-center space-x-1.5 py-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(n)}
              aria-label={t('review.starsLabel', { count: n })}
            >
              <Star size={28} className={n <= displayRating ? 'fill-amber-400 text-amber-400' : 'text-ink-faint'} />
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-muted">{t('review.commentLabel')}</label>
          <textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('review.commentPlaceholder')}
            className="w-full resize-none rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-3 text-xs font-bold text-ink disabled:opacity-60"
        >
          {submitting && <LoaderCircle size={13} className="animate-spin" />}
          <span>{submitting ? t('review.sending') : t('review.submit')}</span>
        </button>
      </div>
    </div>
  )
}
