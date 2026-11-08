import { ArrowLeft, Clock, Languages, ShieldCheck, Wallet, Zap } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { EarningsCalculator } from '../components/EarningsCalculator'
import { StatCard } from '../components/StatCard'
import { useAuth } from '../context/AuthContext'
import { useAdsense } from '../hooks/useAdsense'
import { useReveal } from '../hooks/useReveal'
import { SUPPORTED_LANGUAGES } from '../i18n'
import { formatPrice } from '../lib/utils'

interface BecomeHostProps {
  onOpenAuth: (mode: 'login' | 'signup') => void
}

export function BecomeHost({ onOpenAuth }: BecomeHostProps) {
  const { t } = useTranslation()
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const about = useReveal<HTMLElement>()
  const calculatorTitle = useReveal<HTMLHeadingElement>()
  const benefitsTitle = useReveal<HTMLHeadingElement>()

  useAdsense()

  useEffect(() => {
    if (!loading && user) navigate('/panel-dueno', { replace: true })
  }, [user, loading, navigate])

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center p-4 pb-20 sm:p-6">
      <div className="w-full space-y-1 py-8 sm:py-12">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
          <ArrowLeft size={13} />
          {t('becomeHost.back')}
        </Link>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-accent">{t('becomeHost.eyebrow')}</p>
        <h1 className="mt-2 text-3xl leading-[1.1] font-extrabold tracking-tight text-ink sm:text-5xl">
          {t('becomeHost.title')}
        </h1>
        <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">{t('becomeHost.subtitle')}</p>
        <button
          onClick={() => onOpenAuth('signup')}
          className="glass-drop shine-sweep mt-6 rounded-2xl px-7 py-3.5 text-xs font-bold text-ink"
        >
          {t('becomeHost.cta')}
        </button>
      </div>

      {/* Sobre nosotros */}
      <section
        ref={about.ref}
        className={`reveal grid w-full items-center gap-10 py-16 text-center lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 lg:py-24 lg:text-left ${about.visible ? 'reveal-visible' : ''}`}
      >
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{t('landing.aboutEyebrow')}</p>
          <h2 className="mt-3 text-3xl leading-[1.15] font-extrabold tracking-tight text-ink sm:text-4xl">
            {t('landing.aboutTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base lg:mx-0">
            {t('landing.aboutBody')}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          {[
            { target: 5, suffix: '%', label: t('landing.stat1Label') },
            { target: 100, suffix: '%', label: t('landing.stat2Label') },
            { target: 9, suffix: '', label: t('landing.stat3Label') },
          ].map((stat) => (
            <StatCard key={stat.label} target={stat.target} suffix={stat.suffix} label={stat.label} active={about.visible} />
          ))}
        </div>
      </section>

      {/* Calculadora de ganancias */}
      <section className="w-full space-y-8 py-16 lg:py-24">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">
            {t('becomeHost.calculatorEyebrow')}
          </p>
          <h2
            ref={calculatorTitle.ref}
            className={`reveal mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-ink sm:text-4xl ${calculatorTitle.visible ? 'reveal-visible' : ''}`}
          >
            {t('becomeHost.calculatorTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
            {t('becomeHost.calculatorSubtitle')}
          </p>
        </div>
        <EarningsCalculator />
      </section>

      {/* Beneficios */}
      <section className="w-full space-y-8 py-16 lg:py-24">
        <h2
          ref={benefitsTitle.ref}
          className={`reveal text-center text-3xl font-extrabold tracking-tight text-ink sm:text-4xl ${benefitsTitle.visible ? 'reveal-visible' : ''}`}
        >
          {t('landing.benefitsTitle')}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          <BenefitCard
            Icon={Wallet}
            title={t('landing.benefit4Title')}
            desc={t('landing.benefit4Desc')}
            delay={0}
            span="lg:col-span-2 lg:row-span-2"
          >
            <div className="mt-2 w-full rounded-2xl bg-well/10 p-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-ink-faint">{t('landing.payoutListed')}</span>
                <span className="font-bold text-ink">{formatPrice(100)}</span>
              </div>
              <div className="my-2.5 h-px bg-line/10" />
              <div className="flex items-center justify-between">
                <span className="text-emerald-400">{t('landing.payoutReceived')}</span>
                <span className="font-bold text-emerald-400">{formatPrice(100)}</span>
              </div>
            </div>
          </BenefitCard>

          <BenefitCard
            Icon={Clock}
            title={t('landing.benefit3Title')}
            desc={t('landing.benefit3Desc')}
            delay={90}
            span="lg:col-span-2"
          />

          <BenefitCard Icon={Zap} title={t('landing.benefit1Title')} desc={t('landing.benefit1Desc')} delay={180} />

          <BenefitCard
            Icon={ShieldCheck}
            title={t('landing.benefit2Title')}
            desc={t('landing.benefit2Desc')}
            delay={270}
          />

          <BenefitCard
            Icon={Languages}
            title={t('landing.benefit6Title')}
            desc={t('landing.benefit6Desc')}
            delay={360}
            span="lg:col-span-4"
          >
            <div className="flex flex-wrap gap-1.5 pt-1">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <span
                  key={lang.code}
                  className="flex items-center gap-1 rounded-full bg-well/10 px-2 py-1 text-[10px] text-ink-muted"
                >
                  <span>{lang.flag}</span>
                  <span>{lang.label}</span>
                </span>
              ))}
            </div>
          </BenefitCard>
        </div>
      </section>

      <button
        onClick={() => onOpenAuth('signup')}
        className="glass-drop shine-sweep rounded-2xl px-7 py-3.5 text-xs font-bold text-ink"
      >
        {t('becomeHost.cta')}
      </button>
    </main>
  )
}
