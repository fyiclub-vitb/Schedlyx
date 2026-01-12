import { create } from 'zustand'
import { User } from '../types'
import { auth } from '../lib/supabase'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  emailVerificationRequired: boolean
  verificationEmail: string | null
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  clearVerificationState: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  emailVerificationRequired: false,
  verificationEmail: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signIn(email, password)
      
      if (user && session) {
        set({ 
          user: {
            id: user.id,
            email: user.email!,
            firstName: user.user_metadata?.firstName || user.user_metadata?.first_name || '',
            lastName: user.user_metadata?.lastName || user.user_metadata?.last_name || '',
            avatar: user.user_metadata?.avatar || user.user_metadata?.avatar_url,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at
          },
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      // Check if error is due to unconfirmed email
      if (error.message && error.message.toLowerCase().includes('email not confirmed')) {
        set({ 
          loading: false, 
          error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else {
        set({ 
          loading: false, 
          error: error.message || 'Failed to sign in',
          emailVerificationRequired: false
        })
      }
      throw error
    }
  },

  signUp: async (email: string, password: string, metadata = {}) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signUp(email, password, metadata)
      
      // Check if email confirmation is required
      if (user && !session) {
        // Email confirmation required - don't log user in
        // Component will handle redirect to verification page
        set({ 
          user: null,
          loading: false,
          error: null,
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else if (user && session) {
        // Auto-confirmed (shouldn't happen with email confirmation enabled)
        set({ 
          user: {
            id: user.id,
            email: user.email!,
            firstName: metadata.firstName || user.user_metadata?.first_name || '',
            lastName: metadata.lastName || user.user_metadata?.last_name || '',
            avatar: metadata.avatar || user.user_metadata?.avatar_url,
            createdAt: user.created_at,
            updatedAt: user.updated_at || user.created_at
          },
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign up',
        emailVerificationRequired: false
      })
      throw error
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signInWithGoogle()
      // Don't set loading to false here - the OAuth redirect will happen
      // Loading state will be managed by the callback page
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign in with Google' 
      })
      throw error
    }
  },

  signOut: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signOut()
      set({ 
        user: null, 
        loading: false, 
        error: null,
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign out' 
      })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resetPassword(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to send reset password email' 
      })
      throw error
    }
  },

  resendVerificationEmail: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resendConfirmationEmail(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to resend verification email' 
      })
      throw error
    }
  },

  setUser: (user: User | null) => {
    set({ user, loading: false })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  clearVerificationState: () => {
    set({ 
      emailVerificationRequired: false,
      verificationEmail: null
    })
  }
}))

// Initialize auth state
if (typeof window !== 'undefined') {
  // Check for existing session
  auth.getSession()
    .then(({ session }) => {
      if (session?.user) {
        useAuthStore.getState().setUser({
          id: session.user.id,
          email: session.user.email!,
          firstName: session.user.user_metadata?.firstName || 
                    session.user.user_metadata?.first_name || 
                    session.user.user_metadata?.given_name || '',
          lastName: session.user.user_metadata?.lastName || 
                   session.user.user_metadata?.last_name || 
                   session.user.user_metadata?.family_name || '',
          avatar: session.user.user_metadata?.avatar || 
                 session.user.user_metadata?.avatar_url || 
                 session.user.user_metadata?.picture,
          createdAt: session.user.created_at,
          updatedAt: session.user.updated_at || session.user.created_at
        })
      }
      useAuthStore.getState().setLoading(false)
    })
    .catch(() => {
      useAuthStore.getState().setLoading(false)
    })

  // Listen for auth changes
  auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session?.user?.email)
    
    if (event === 'SIGNED_IN' && session?.user) {
      useAuthStore.getState().setUser({
        id: session.user.id,
        email: session.user.email!,
        firstName: session.user.user_metadata?.firstName || 
                  session.user.user_metadata?.first_name || 
                  session.user.user_metadata?.given_name || '',
        lastName: session.user.user_metadata?.lastName || 
                 session.user.user_metadata?.last_name || 
                 session.user.user_metadata?.family_name || '',
        avatar: session.user.user_metadata?.avatar || 
               session.user.user_metadata?.avatar_url || 
               session.user.user_metadata?.picture,
        createdAt: session.user.created_at,
        updatedAt: session.user.updated_at || session.user.created_at
      })
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      // Update user data on token refresh
      useAuthStore.getState().setUser({
        id: session.user.id,
        email: session.user.email!,
        firstName: session.user.user_metadata?.firstName || 
                  session.user.user_metadata?.first_name || 
                  session.user.user_metadata?.given_name || '',
        lastName: session.user.user_metadata?.lastName || 
                 session.user.user_metadata?.last_name || 
                 session.user.user_metadata?.family_name || '',
        avatar: session.user.user_metadata?.avatar || 
               session.user.user_metadata?.avatar_url || 
               session.user.user_metadata?.picture,
        createdAt: session.user.created_at,
        updatedAt: session.user.updated_at || session.user.created_at
      })
    }
  })
}