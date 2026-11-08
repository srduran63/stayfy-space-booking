import { LoaderCircle, X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { peekReferralCode, setReferralCode } from '../lib/referral'

interface AuthModalProps {
  open: boolean
  initialMode: 'login' | 'signup'
  onClose: () => void
}

export function AuthModal({ open, initialMode, onClose }: AuthModalProps) {
  const { signInWithPassword, signUpWithPassword, signInWithGoogle, sendPasswordReset } = useAuth()
  const { showToast } = useToast()
  const { t } = useTranslation()
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [referralCode, setReferralCodeInput] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [visible, setVisible] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [shouldRender, setShouldRender] = useState(open)

  useEffect(() => {
    if (open) {
      setShouldRender(true)
      setMode(initialMode)
      setEmail('')
      setPassword('')
      setFullName('')
      setReferralCodeInput(peekReferralCode())
      setTermsAccepted(false)
      setResetSent(false)
      const t = setTimeout(() => setVisible(true), 10)
      return () => clearTimeout(t)
    }
    setVisible(false)
    const t = setTimeout(() => setShouldRender(false), 300)
    return () => clearTimeout(t)
  }, [open, initialMode])

  if (!shouldRender) return null

  const isSignUp = mode === 'signup'
  const isForgot = mode === 'forgot'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()

    if (isForgot) {
      setSubmitting(true)
      const result = await sendPasswordReset(email)
      setSubmitting(false)
      if (result.error) {
        showToast(result.error)
        return
      }
      setResetSent(true)
      return
    }

    if (isSignUp && !termsAccepted) {
      showToast(t('auth.mustAcceptTerms'))
      return
    }
    if (isSignUp) setReferralCode(referralCode)
    setSubmitting(true)
    const result = isSignUp
      ? await signUpWithPassword(email, password, fullName || email.split('@')[0])
      : await signInWithPassword(email, password)
    setSubmitting(false)

    if (result.error) {
      showToast(result.error)
      return
    }

    onClose()
    showToast(isSignUp ? t('auth.accountCreated') : t('auth.welcomeBack'))
  }

  async function handleGoogle() {
    if (isSignUp && !termsAccepted) {
      showToast(t('auth.mustAcceptTerms'))
      return
    }
    if (isSignUp) setReferralCode(referralCode)
    const result = await signInWithGoogle()
    if (result.error) showToast(result.error)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-opacity duration-300 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
    >
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
          <h3 className="text-lg font-bold text-ink">
            {isForgot ? t('auth.forgotPasswordTitle') : isSignUp ? t('auth.createAccount') : t('auth.login')}
          </h3>
          <p className="text-xs text-ink-muted">
            {isForgot
              ? t('auth.forgotPasswordSubtitle')
              : isSignUp
                ? t('auth.signupSubtitle')
                : t('auth.loginSubtitle')}
          </p>
        </div>

        {isForgot ? (
          resetSent ? (
            <div className="space-y-4">
              <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                {t('auth.resetLinkSent')}
              </p>
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-[11px] text-indigo-400 transition hover:underline"
              >
                {t('auth.backToLogin')}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-semibold text-ink disabled:opacity-60"
              >
                {submitting && <LoaderCircle size={13} className="animate-spin" />}
                <span>{submitting ? t('auth.processing') : t('auth.sendResetLink')}</span>
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-[11px] text-indigo-400 transition hover:underline"
                >
                  {t('auth.backToLogin')}
                </button>
              </div>
            </form>
          )
        ) : (
          <>
            {isSignUp && (
              <label className="flex items-start space-x-2 text-[11px] text-ink-muted">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-indigo-500"
                />
                <span>
                  {t('auth.acceptTerms')}{' '}
                  <Link to="/terminos" target="_blank" className="text-accent hover:underline">
                    {t('auth.termsLink')}
                  </Link>
                  {t('auth.acceptTermsSuffix')}
                </span>
              </label>
            )}

            <button
              type="button"
              onClick={handleGoogle}
              disabled={isSignUp && !termsAccepted}
              className="flex w-full items-center justify-center space-x-2 rounded-2xl bg-white/90 py-2.5 text-xs font-semibold text-gray-900 shadow-md transition hover:bg-white disabled:opacity-60"
            >
              <span>{t('auth.continueWithGoogle')}</span>
            </button>

            <div className="my-2 flex items-center">
              <div className="flex-grow border-t border-line/10" />
              <span className="px-3 text-[10px] uppercase text-ink-muted">{t('auth.orEmail')}</span>
              <div className="flex-grow border-t border-line/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">{t('auth.fullName')}</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={t('auth.fullNamePlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-ink-muted">{t('auth.email')}</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-medium text-ink-muted">{t('auth.password')}</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[10.5px] text-indigo-400 transition hover:underline"
                    >
                      {t('auth.forgotPassword')}
                    </button>
                  )}
                </div>
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
              {isSignUp && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium text-ink-muted">{t('auth.referralCode')}</label>
                  <input
                    type="text"
                    value={referralCode}
                    onChange={(e) => setReferralCodeInput(e.target.value)}
                    placeholder={t('auth.referralCodePlaceholder')}
                    className="w-full rounded-2xl border border-line/10 bg-well/40 px-3.5 py-2.5 text-xs text-ink transition focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
              <button
                type="submit"
                disabled={submitting || (isSignUp && !termsAccepted)}
                className="glass-drop flex w-full items-center justify-center space-x-2 rounded-2xl py-2.5 text-xs font-semibold text-ink disabled:opacity-60"
              >
                {submitting && <LoaderCircle size={13} className="animate-spin" />}
                <span>{submitting ? t('auth.processing') : isSignUp ? t('auth.signupButton') : t('auth.loginButton')}</span>
              </button>
              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setMode(isSignUp ? 'login' : 'signup')}
                  className="text-[11px] text-indigo-400 transition hover:underline"
                >
                  {isSignUp ? t('auth.hasAccount') : t('auth.noAccount')}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
