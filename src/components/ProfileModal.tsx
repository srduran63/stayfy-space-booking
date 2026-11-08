import { LoaderCircle, LogOut, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { getInitials } from '../lib/utils'
import { LanguageSwitcher } from './LanguageSwitcher'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, profile, updateProfile, signOut } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setFullName(profile?.full_name ?? '')
      setPhone(profile?.phone ?? '')
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
  }, [open, profile])

  if (!open) return null

  const initials = getInitials(profile?.full_name || user?.email || 'US')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await updateProfile({ full_name: fullName, phone })
    setSubmitting(false)
    if (result.error) {
      showToast(result.error)
      return
    }
    onClose()
    showToast(t('profile.updated'))
  }

  async function handleLogout() {
    await signOut()
    onClose()
    showToast(t('profile.loggedOut'))
  }

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
          <h3 className="text-lg font-bold text-ink">{t('profile.title')}</h3>
          <p className="text-xs text-ink-muted">{t('profile.subtitle')}</p>
        </div>

        <div className="flex items-center space-x-4 py-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-line/20 bg-indigo-600 text-lg font-bold text-ink shadow-lg">
            {initials}
          </div>
          <div>
            <h4 className="text-xs font-semibold text-ink">{user?.email}</h4>
            <span className="text-[10px] text-accent">{t('profile.verifiedAccount')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('profile.fullName')}</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('profile.phone')}</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 305 000 0000"
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('profile.language')}</label>
            <LanguageSwitcher variant="full" />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-semibold text-ink"
          >
            {submitting && <LoaderCircle size={13} className="animate-spin" />}
            <span>{submitting ? t('profile.saving') : t('profile.saveChanges')}</span>
          </button>
        </form>

        <div className="border-t border-line/10 pt-3">
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center space-x-2 rounded-2xl border border-red-500/20 bg-red-500/10 py-2.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 hover:text-red-200"
          >
            <LogOut size={12} />
            <span>{t('profile.logout')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
