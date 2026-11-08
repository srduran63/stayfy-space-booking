import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LoadingSpinner } from './LoadingSpinner'
import { isAdminEmail } from '../lib/constants'

interface ProtectedRouteProps {
  children: ReactNode
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  if (!user) return <Navigate to="/" replace />

  if (adminOnly && !isAdminEmail(user.email)) return <Navigate to="/dashboard" replace />

  return <>{children}</>
}
