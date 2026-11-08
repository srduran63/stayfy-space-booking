import { LoaderCircle } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export function ResetPasswordModal() {
  const { passwordRecovery, updatePassword, clearPasswordRecovery } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!passwordRecovery) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (password !== confirmPassword) {
      showToast(t('auth.passwordsDontMatch'))
      return
    }
    setSubmitting(true)
    const result = await updatePassword(password)
    setSubmitting(false)
    if (result.error) {
      showToast(result.error)
      return
    }
    showToast(t('auth.passwordUpdated'))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div className="glass-modal relative w-full max-w-sm space-y-5 rounded-3xl p-6 shadow-2xl">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-ink">{t('auth.setNewPasswordTitle')}</h3>
          <p className="text-xs text-ink-muted">{t('auth.setNewPasswordSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('auth.newPassword')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-ink-muted">{t('auth.confirmNewPassword')}</label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-semibold text-ink disabled:opacity-60"
          >
            {submitting && <LoaderCircle size={13} className="animate-spin" />}
            <span>{submitting ? t('auth.processing') : t('auth.updatePassword')}</span>
          </button>
          <button
            type="button"
            onClick={clearPasswordRecovery}
            className="w-full text-center text-[11px] text-ink-faint transition hover:text-ink-muted"
          >
            {t('common.cancel')}
          </button>
        </form>
      </div>
    </div>
  )
}
