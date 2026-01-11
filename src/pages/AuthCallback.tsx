import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

export function AuthCallback() {
  const navigate = useNavigate()
  const { setUser, setLoading } = useAuthStore()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the session from the URL
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) throw error

        if (session?.user) {
          // Update the auth store with the user data
          setUser({
            id: session.user.id,
            email: session.user.email!,
            firstName: session.user.user_metadata?.given_name || session.user.user_metadata?.firstName || '',
            lastName: session.user.user_metadata?.family_name || session.user.user_metadata?.lastName || '',
            avatar: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture,
            createdAt: session.user.created_at,
            updatedAt: session.user.updated_at || session.user.created_at
          })

          // Redirect to dashboard
          navigate('/dashboard')
        } else {
          // No session found, redirect to login
          navigate('/login')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login')
      } finally {
        setLoading(false)
      }
    }

    handleCallback()
  }, [navigate, setUser, setLoading])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-600">Completing sign in...</p>
      </div>
    </div>
  )
}