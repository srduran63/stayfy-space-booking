interface LoadingSpinnerProps {
  size?: number
  label?: string
  className?: string
}

export function LoadingSpinner({ size = 30, label, className = '' }: LoadingSpinnerProps) {
  return (
    <div className={`flex w-full flex-col items-center justify-center gap-3 py-8 ${className}`}>
      <img src="/favicon.svg" alt="" style={{ width: size, height: size }} className="animate-bolt-pulse" />
      {label && <p className="text-xs text-ink-muted">{label}</p>}
    </div>
  )
}
