import { useEffect, useState } from 'react'

export function useCountUp(target: number, active: boolean, duration = 1100): number {
  const [value, setValue] = useState(0)

  useEffect(() => {
    if (!active) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setValue(target)
      return
    }

    let start: number | null = null
    let raf: number
    function step(timestamp: number) {
      if (start === null) start = timestamp
      const progress = Math.min((timestamp - start) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(target * eased))
      if (progress < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [active, target, duration])

  return value
}
