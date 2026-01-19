// src/components/ProtectedRoute.tsx
// FIXED: Removed setTimeout hack that caused flicker and race conditions
// FIXED: Simplified logic - rely on auth store loading state only

import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface ProtectedRouteProps {
  children: ReactNode
}

/**
 * Protected route component that redirects unauthenticated users to login
 * 
 * FIXES:
 * - Removed setTimeout hack (caused flicker and race conditions)
 * - No artificial delays or timers
 * - Single source of truth: auth store loading state
 * - Clean, predictable behavior
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}