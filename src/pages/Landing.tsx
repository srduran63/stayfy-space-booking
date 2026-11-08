import {
  ArrowRight,
  BedDouble,
  CalendarCheck,
  Clock,
  Gift,
  MapPin,
  Presentation,
  ShieldCheck,
  Star,
  Warehouse,
} from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { BenefitCard } from '../components/BenefitCard'
import { useAuth } from '../context/AuthContext'
import { useAdsense } from '../hooks/useAdsense'
import { useReveal } from '../hooks/useReveal'
import { formatPrice } from '../lib/utils'

interface LandingProps {
  onOpenAuth: (mode: 'login' | 'signup') => void
}

interface MockSpace {
  title: string
  city: string
  Icon: typeof BedDouble
  price: number
  priceUnit: 'night' | 'hour'
  rating: number | null
  reviews: number
  gradient: string
}

const MOCK_SPACES: MockSpace[] = [
  {
    title: 'Loft en Wynwood',
    city: 'Miami',
    Icon: Warehouse,
    price: 95,
    priceUnit: 'night',
    rating: 4.9,
    reviews: 32,
    gradient: 'linear-gradient(135deg, #fb923c 0%, #ef4444 55%, #7c2d92 100%)',
  },
  {
    title: 'Suite Skyline',
    city: 'Miami',
    Icon: BedDouble,
    price: 210,
    priceUnit: 'night',
    rating: 4.8,
    reviews: 58,
    gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 55%, #1e1b4b 100%)',
  },
  {
    title: 'Sala Downtown',
    city: 'Miami',
    Icon: Presentation,
    price: 35,
    priceUnit: 'hour',
    rating: null,
    reviews: 0,
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #0ea5e9 55%, #1e3a8a 100%)',
  },
]

function HeroPreview() {
  const { t } = useTranslation()
  return (
    <div className="relative mx-auto w-full max-w-sm lg:max-w-none">
      <div
        className="glass-modal rounded-[28px] p-3 shadow-2xl transition-transform duration-700 lg:[transform:perspective(1400px)_rotateY(-7deg)_rotateX(3deg)] lg:hover:[transform:perspective(1400px)_rotateY(-3deg)_rotateX(1deg)]"
        aria-hidden="true"
      >
        <div className="flex items-center gap-1.5 px-2 pb-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
          <div className="ml-3 flex-1 truncate rounded-full bg-well/15 px-3 py-1 text-[10px] text-ink-faint">
            stayfyapp.com/dashboard
          </div>
        </div>
        <div className="space-y-2.5">
          {MOCK_SPACES.map((space) => (
            <div key={space.title} className="flex items-center gap-3 rounded-2xl bg-well/10 p-2">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-white/90"
                style={{ background: space.gradient }}
              >
                <space.Icon size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ink">{space.title}</p>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-ink-faint">
                  <MapPin size={9} />
                  <span>{space.city}</span>
                </div>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-400">
                  {space.rating != null ? (
                    <>
                      <Star size={9} className="fill-amber-400" />
                      <span>
                        {space.rating} <span className="text-ink-faint">({space.reviews})</span>
                      </span>
                    </>
                  ) : (
                    <span className="text-ink-faint">{t('common.new')}</span>
                  )}
                </div>
              </div>
              <div className="shrink-0 text-right text-xs font-bold text-ink">
                {formatPrice(space.price)}
                <div className="font-normal text-ink-faint">
                  {space.priceUnit === 'night' ? t('common.perNight') : t('common.perHour')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div
        className="pointer-events-none absolute -bottom-8 -right-6 -z-10 h-40 w-40 rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      />
    </div>
  )
}


export function Landing({ onOpenAuth }: LandingProps) {
  const { user, loading } = useAuth()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const clientSectionTitle = useReveal<HTMLHeadingElement>()

  useAdsense()

  useEffect(() => {
    if (!loading && user) navigate('/dashboard', { replace: true })
  }, [user, loading, navigate])

  useEffect(() => {
    import('@google/model-viewer')
  }, [])

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center p-4 pb-20 sm:p-6">
      {/* Hero */}
      <section className="relative grid w-full items-center gap-12 py-10 sm:py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-8 lg:py-16">
        <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
          <div className="mb-5 flex items-center gap-2">
            <img src="/favicon.svg" alt="Stayfy" className="animate-float h-7 w-auto" />
            <span className="text-base font-bold tracking-tight text-ink">Stayfy</span>
          </div>
          <h1 className="text-4xl leading-[1.1] font-extrabold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
            {t('landing.heroHeadline')}
          </h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted sm:text-base">
            {t('landing.description')}
          </p>

          <div className="mt-8 flex w-full max-w-xs flex-col justify-center gap-3 sm:flex-row lg:max-w-none">
            <button
              onClick={() => onOpenAuth('signup')}
              className="glass-drop shine-sweep w-full rounded-2xl px-7 py-3.5 text-xs font-bold text-ink sm:w-auto"
            >
              {t('landing.cta')}
            </button>
          </div>

          {/* Adornos vacacionales en mobile: fila simple, ya que ahí no se muestra la vista previa de la app */}
          <div className="mt-8 flex items-end justify-center gap-6 lg:hidden">
            <img
              src="/decor/palmera.png"
              alt=""
              aria-hidden="true"
              className="animate-float-strong pointer-events-none h-16 w-auto opacity-90 drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]"
              style={{ animationDelay: '0.4s', animationDuration: '6s' }}
            />
            <model-viewer
              src="/decor/models/salvavidas.glb"
              alt=""
              aria-hidden="true"
              shadow-intensity="0"
              disable-zoom={true}
              disable-pan={true}
              disable-tap={true}
              interaction-prompt="none"
              loading="eager"
              exposure="1.1"
              className="animate-float-bob pointer-events-none opacity-90 drop-shadow-[0_8px_14px_rgba(0,0,0,0.35)]"
              style={{ width: '56px', height: '56px', animationDelay: '1.2s', animationDuration: '5.5s' }}
            />
            <model-viewer
              src="/decor/models/maleta.glb"
              alt=""
              aria-hidden="true"
              shadow-intensity="0"
              disable-zoom={true}
              disable-pan={true}
              disable-tap={true}
              interaction-prompt="none"
              loading="eager"
              exposure="1.1"
              className="animate-float-bob pointer-events-none opacity-90 drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]"
              style={{ width: '84px', height: '84px', animationDelay: '0s', animationDuration: '6.5s' }}
            />
          </div>
        </div>

        {/* Vista previa de la app: solo en escritorio, en mobile mostramos los adornos en su lugar */}
        <div className="hidden lg:contents">
          <HeroPreview />

          <img
            src="/decor/palmera.png"
            alt=""
            aria-hidden="true"
            className="animate-float-strong pointer-events-none absolute -bottom-4 left-[4%] w-24 opacity-90 drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
            style={{ animationDelay: '0.4s', animationDuration: '6s' }}
          />
          <model-viewer
            src="/decor/models/salvavidas.glb"
            alt=""
            aria-hidden="true"
            shadow-intensity="0"
            disable-zoom={true}
            disable-pan={true}
            disable-tap={true}
            interaction-prompt="none"
            loading="eager"
            exposure="1.1"
            className="animate-float-bob pointer-events-none absolute bottom-2 left-[27%] opacity-90 drop-shadow-[0_10px_18px_rgba(0,0,0,0.4)]"
            style={{ width: '88px', height: '88px', animationDelay: '1.2s', animationDuration: '5.5s' }}
          />
          <model-viewer
            src="/decor/models/maleta.glb"
            alt=""
            aria-hidden="true"
            shadow-intensity="0"
            disable-zoom={true}
            disable-pan={true}
            disable-tap={true}
            interaction-prompt="none"
            loading="eager"
            exposure="1.1"
            className="animate-float-bob pointer-events-none absolute -bottom-10 right-[-6%] opacity-90 drop-shadow-[0_12px_24px_rgba(0,0,0,0.45)]"
            style={{ width: '148px', height: '148px', animationDelay: '0s', animationDuration: '6.5s' }}
          />
        </div>
      </section>

      {/* Beneficios para el cliente */}
      <section className="w-full space-y-8 py-16 lg:py-24">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-widest text-accent">{t('landing.clientEyebrow')}</p>
          <h2
            ref={clientSectionTitle.ref}
            className={`reveal mx-auto mt-3 max-w-lg text-3xl font-extrabold tracking-tight text-ink sm:text-4xl ${clientSectionTitle.visible ? 'reveal-visible' : ''}`}
          >
            {t('landing.clientTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-ink-muted sm:text-base">
            {t('landing.clientBody')}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          <BenefitCard
            Icon={Star}
            title={t('landing.clientBenefit1Title')}
            desc={t('landing.clientBenefit1Desc')}
            delay={0}
            span="lg:col-span-2 lg:row-span-2"
          >
            <div className="mt-2 flex w-full items-center gap-2.5 rounded-2xl bg-well/10 p-4 text-xs">
              <div className="flex gap-0.5 text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} size={13} className="fill-amber-400" />
                ))}
              </div>
              <ArrowRight size={13} className="shrink-0 text-ink-faint" />
              <span className="font-bold text-emerald-400">-5% {t('landing.clientBenefit1Badge')}</span>
            </div>
          </BenefitCard>

          <BenefitCard
            Icon={Gift}
            title={t('landing.clientBenefit2Title')}
            desc={t('landing.clientBenefit2Desc')}
            delay={90}
            span="lg:col-span-2"
          />

          <BenefitCard
            Icon={Clock}
            title={t('landing.clientBenefit3Title')}
            desc={t('landing.clientBenefit3Desc')}
            delay={180}
          />

          <BenefitCard
            Icon={ShieldCheck}
            title={t('landing.clientBenefit4Title')}
            desc={t('landing.clientBenefit4Desc')}
            delay={270}
          />

          <BenefitCard
            Icon={CalendarCheck}
            title={t('landing.clientBenefit5Title')}
            desc={t('landing.clientBenefit5Desc')}
            delay={360}
            span="lg:col-span-4"
          />
        </div>
      </section>

      <Link to="/terminos" className="text-[11px] text-ink-faint hover:text-ink-muted hover:underline">
        {t('landing.terms')}
      </Link>
    </main>
  )
}
