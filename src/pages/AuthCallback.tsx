import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function AuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setLoading } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setLoading(true)
        console.log('Starting auth callback...')
        console.log('URL:', window.location.href)
        
        // Check if we have an error in the URL
        const errorParam = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (errorParam) {
          console.error('OAuth error:', errorParam, errorDescription)
          setError(errorDescription || errorParam)
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        // For implicit flow, Supabase automatically handles the hash fragment
        // Just get the session
        console.log('Checking for session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('Session found:', !!session?.user)
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          setTimeout(() => navigate('/login'), 2000)
          return
        }

        if (session?.user) {
          console.log('User authenticated:', session.user.email)
          
          // Update the auth store with the user data
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: session.user.user_metadata?.given_name || 
                      session.user.user_metadata?.firstName || 
                      session.user.user_metadata?.first_name || '',
            lastName: session.user.user_metadata?.family_name || 
                     session.user.user_metadata?.lastName || 
                     session.user.user_metadata?.last_name || '',
            avatar: session.user.user_metadata?.avatar_url || 
                   session.user.user_metadata?.picture,
            createdAt: session.user.created_at,
            updatedAt: session.user.updated_at || session.user.created_at
          })

          // Redirect to dashboard
          setTimeout(() => {
            console.log('Redirecting to dashboard...')
            navigate('/dashboard', { replace: true })
          }, 500)
        } else {
          console.error('No session found')
          setError('Authentication incomplete. Please try signing in again.')
          setTimeout(() => navigate('/login'), 2000)
        }
      } catch (error: any) {
        console.error('Auth callback error:', error)
        setError(error?.message || 'Authentication failed. Please try again.')
        setTimeout(() => navigate('/login'), 2000)
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [navigate, setUser, setLoading, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        {error ? (
          <>
            <div className="inline-block rounded-full h-12 w-12 border-4 border-red-600 border-t-transparent mb-4"></div>
            <p className="mt-4 text-red-600 font-medium">{error}</p>
            <p className="mt-2 text-gray-600 text-sm">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-600">Completing sign in...</p>
            <p className="mt-2 text-gray-500 text-sm">Please wait while we set up your account</p>
          </>
        )}
      </div>
    </div>
  )
}