import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { useReveal } from '../hooks/useReveal'

interface BenefitCardProps {
  Icon: LucideIcon
  title: string
  desc: string
  delay: number
  span?: string
  children?: ReactNode
}

export function BenefitCard({ Icon, title, desc, delay, span = '', children }: BenefitCardProps) {
  const { ref, visible } = useReveal<HTMLDivElement>()
  return (
    <div
      ref={ref}
      className={`glass-card reveal flex flex-col items-start space-y-3 rounded-3xl p-5 sm:p-6 ${span} ${visible ? 'reveal-visible' : ''}`}
      style={{ transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/15 text-accent">
        <Icon size={18} />
      </div>
      <h3 className="text-sm font-bold text-ink sm:text-base">{title}</h3>
      <p className="text-xs leading-relaxed text-ink-muted">{desc}</p>
      {children}
    </div>
  )
}
