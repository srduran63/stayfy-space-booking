import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Region = 'CO' | 'GLOBAL'

const STORAGE_KEY = 'stayfy_region'
const GEO_TIMEOUT_MS = 2000

interface RegionContextValue {
  region: Region
  currency: 'COP' | 'USD'
  detecting: boolean
  setRegion: (region: Region) => void
}

const RegionContext = createContext<RegionContextValue | undefined>(undefined)

function currencyFor(region: Region): 'COP' | 'USD' {
  return region === 'CO' ? 'COP' : 'USD'
}

export function RegionProvider({ children }: { children: ReactNode }) {
  const [region, setRegionState] = useState<Region>('GLOBAL')
  const [detecting, setDetecting] = useState(true)

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (stored === 'CO' || stored === 'GLOBAL') {
      setRegionState(stored)
      setDetecting(false)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS)

    fetch('/api/geo', { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { country?: string | null } | null) => {
        if (cancelled) return
        setRegionState(data?.country === 'CO' ? 'CO' : 'GLOBAL')
      })
      .catch(() => {
        // Fallback seguro: si la API de geolocalización falla o tarda, no bloqueamos al usuario.
        if (!cancelled) setRegionState('GLOBAL')
      })
      .finally(() => {
        clearTimeout(timeout)
        if (!cancelled) setDetecting(false)
      })

    return () => {
      cancelled = true
      clearTimeout(timeout)
      controller.abort()
    }
  }, [])

  function setRegion(next: Region) {
    setRegionState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return (
    <RegionContext.Provider value={{ region, currency: currencyFor(region), detecting, setRegion }}>
      {children}
    </RegionContext.Provider>
  )
}

export function useRegion() {
  const ctx = useContext(RegionContext)
  if (!ctx) throw new Error('useRegion debe usarse dentro de RegionProvider')
  return ctx
}
