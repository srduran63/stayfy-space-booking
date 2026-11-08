import { useCountUp } from '../hooks/useCountUp'

interface StatCardProps {
  target: number
  suffix: string
  label: string
  active: boolean
}

export function StatCard({ target, suffix, label, active }: StatCardProps) {
  const value = useCountUp(target, active)
  return (
    <div className="glass-card rounded-2xl p-4 text-center lg:p-5 lg:text-left">
      <p className="text-3xl font-extrabold tracking-tight text-ink tabular-nums sm:text-4xl">
        {value}
        {suffix}
      </p>
      <p className="mt-1.5 text-[11px] leading-snug text-ink-muted">{label}</p>
    </div>
  )
}
