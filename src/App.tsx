import { lazy, Suspense, useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AuthModal } from './components/AuthModal'
import { Header } from './components/Header'
import { LoadingSpinner } from './components/LoadingSpinner'
import { ProfileModal } from './components/ProfileModal'
import { ProtectedRoute } from './components/ProtectedRoute'
import { ResetPasswordModal } from './components/ResetPasswordModal'
import { SetupBanner } from './components/SetupBanner'
import { StayBot } from './components/StayBot'
import { WelcomeCarousel } from './components/WelcomeCarousel'
import { AuthProvider, useAuth } from './context/AuthContext'
import { RegionProvider } from './context/RegionContext'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'
import { captureReferralCode } from './lib/referral'
import { isSupabaseConfigured } from './lib/supabaseClient'
import { BecomeHost } from './pages/BecomeHost'
import { Dashboard } from './pages/Dashboard'
import { Favorites } from './pages/Favorites'
import { Landing } from './pages/Landing'
import { MyBookings } from './pages/MyBookings'
import { Terms } from './pages/Terms'

const PartnerPanel = lazy(() => import('./pages/PartnerPanel').then((m) => ({ default: m.PartnerPanel })))
const HostPanel = lazy(() => import('./pages/HostPanel').then((m) => ({ default: m.HostPanel })))

function AppShell() {
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: false,
    mode: 'login',
  })
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  const location = useLocation()
  const { profile, justSignedIn, clearJustSignedIn } = useAuth()

  const openAuth = (mode: 'login' | 'signup') => setAuthModal({ open: true, mode })
  const closeAuth = () => setAuthModal((prev) => ({ ...prev, open: false }))

  useEffect(() => {
    captureReferralCode()
  }, [])

  useEffect(() => {
    if (!justSignedIn || !profile) return
    const t = setTimeout(() => setWelcomeOpen(true), 350)
    return () => clearTimeout(t)
  }, [justSignedIn, profile])

  const isNewUser = Boolean(profile && Date.now() - new Date(profile.created_at).getTime() < 2 * 60 * 1000)

  return (
    <div className="animated-gradient-bg flex min-h-screen flex-col bg-staydark text-ink selection:bg-indigo-500 selection:text-ink">
      <div className="bg-grid" aria-hidden="true" />
      <div className="bg-blob-accent" aria-hidden="true" />
      <div className="bg-grain" aria-hidden="true" />
      <Header onOpenAuth={openAuth} onOpenProfile={() => setProfileModalOpen(true)} />

      {!isSupabaseConfigured && <SetupBanner />}

      <div key={location.pathname} className="page-transition flex flex-1 flex-col">
        <Routes location={location}>
          <Route path="/" element={<Landing onOpenAuth={openAuth} />} />
          <Route path="/terminos" element={<Terms />} />
          <Route path="/asociarme" element={<BecomeHost onOpenAuth={openAuth} />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-reservas"
            element={
              <ProtectedRoute>
                <MyBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/favoritos"
            element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            }
          />
          <Route
            path="/panel-dueno"
            element={
              <ProtectedRoute>
                <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                  <PartnerPanel />
                </Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/mis-espacios"
            element={
              <ProtectedRoute adminOnly>
                <Suspense fallback={<LoadingSpinner className="min-h-[50vh]" />}>
                  <HostPanel />
                </Suspense>
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      <AuthModal open={authModal.open} initialMode={authModal.mode} onClose={closeAuth} />
      <ProfileModal open={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      <ResetPasswordModal />
      <WelcomeCarousel
        open={welcomeOpen}
        isNewUser={isNewUser}
        onClose={() => {
          setWelcomeOpen(false)
          clearJustSignedIn()
        }}
      />
      <StayBot />
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <RegionProvider>
        <AuthProvider>
          <ToastProvider>
            <AppShell />
          </ToastProvider>
        </AuthProvider>
      </RegionProvider>
    </ThemeProvider>
  )
}

export default App
