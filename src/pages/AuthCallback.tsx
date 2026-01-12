import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Fixed AuthCallback component
 * 
 * Changes made:
 * - Removed manual session handling - let Supabase handle session hydration
 * - Removed all console.logs
 * - Removed redundant state management
 * - Simplified to just redirect - Supabase auth state listener handles the rest
 */
export function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    // Supabase automatically handles OAuth callback and session hydration
    // The auth state listener in authStore.ts will update the Zustand store
    // We just need to redirect to dashboard
    const timer = setTimeout(() => {
      navigate('/dashboard', { replace: true })
    }, 1000)

    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
        <p className="mt-2 text-gray-500 text-sm">Please wait while we set up your account</p>
      </div>
    </div>
  )
}