let audioCtx: AudioContext | null = null

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!audioCtx) audioCtx = new Ctor()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

// Sonido "pop" sintetizado (sin archivo de audio) — sutil, corto, para momentos clave puntuales.
export function playPop() {
  const ctx = getContext()
  if (!ctx) return
  try {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(520, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08)
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.012)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.13)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.14)
  } catch {
    // Audio bloqueado o no soportado — falla en silencio, no es crítico.
  }
}
