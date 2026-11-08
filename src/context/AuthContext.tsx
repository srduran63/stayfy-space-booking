import type { Session, User } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { consumeReferralCode } from '../lib/referral'
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient'
import type { Profile } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  isHost: boolean
  passwordRecovery: boolean
  justSignedIn: boolean
  clearJustSignedIn: () => void
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>
  signUpWithPassword: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signInWithGoogle: () => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<Profile, 'full_name' | 'phone'>>) => Promise<{ error: string | null }>
  refreshProfile: () => Promise<void>
  refreshIsHost: () => Promise<void>
  sendPasswordReset: (email: string) => Promise<{ error: string | null }>
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>
  clearPasswordRecovery: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const [justSignedIn, setJustSignedIn] = useState(false)

  async function loadProfile(userId: string) {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setProfile(data as Profile)
  }

  async function applyPendingReferral(userId: string) {
    const refCode = consumeReferralCode()
    if (!refCode || userId.startsWith(refCode)) return

    // La fila de perfil la crea un trigger justo después del alta y puede tardar
    // un instante en quedar visible vía la API — reintenta antes de rendirse.
    let existing: { referred_by: string | null } | null = null
    for (let attempt = 0; attempt < 5; attempt++) {
      const { data } = await supabase.from('profiles').select('referred_by').eq('id', userId).maybeSingle()
      if (data) {
        existing = data
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    if (!existing || existing.referred_by) return

    const { data: referrerId } = await supabase.rpc('resolve_referrer', { code: refCode })
    if (referrerId) await supabase.from('profiles').update({ referred_by: referrerId }).eq('id', userId)
  }

  async function loadIsHost(userId: string) {
    const { count } = await supabase
      .from('spaces')
      .select('id', { count: 'exact', head: true })
      .eq('host_id', userId)
    setIsHost((count ?? 0) > 0)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) {
        loadProfile(data.session.user.id)
        loadIsHost(data.session.user.id)
      }
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_IN') setJustSignedIn(true)
      if (newSession?.user) {
        const userId = newSession.user.id
        applyPendingReferral(userId).finally(() => loadProfile(userId))
        loadIsHost(userId)
      } else {
        setProfile(null)
        setIsHost(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function signInWithPassword(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUpWithPassword(email: string, password: string, fullName: string) {
    // La atribución de referido corre desde el listener central de onAuthStateChange
    // (cubre este flujo y también Google OAuth), no hace falta duplicarla aquí.
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { error: error?.message ?? null }
  }

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateProfile(updates: Partial<Pick<Profile, 'full_name' | 'phone'>>) {
    if (!session?.user) return { error: 'No hay sesión activa' }
    const { error } = await supabase.from('profiles').update(updates).eq('id', session.user.id)
    if (!error) await loadProfile(session.user.id)
    return { error: error?.message ?? null }
  }

  async function refreshProfile() {
    if (session?.user) await loadProfile(session.user.id)
  }

  async function refreshIsHost() {
    if (session?.user) await loadIsHost(session.user.id)
  }

  async function sendPasswordReset(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { error: error?.message ?? null }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (!error) setPasswordRecovery(false)
    return { error: error?.message ?? null }
  }

  function clearPasswordRecovery() {
    setPasswordRecovery(false)
  }

  function clearJustSignedIn() {
    setJustSignedIn(false)
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        isHost,
        passwordRecovery,
        justSignedIn,
        clearJustSignedIn,
        signInWithPassword,
        signUpWithPassword,
        signInWithGoogle,
        signOut,
        updateProfile,
        refreshProfile,
        refreshIsHost,
        sendPasswordReset,
        updatePassword,
        clearPasswordRecovery,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
