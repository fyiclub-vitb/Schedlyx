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

/**
 * Fixed Auth Store
 * 
 * Changes made:
 * - Clear verification state on SIGNED_OUT
 * - Clear verification state on SIGNED_IN
 * - Clear verification state on page refresh
 * - Clear verification state on tab close
 * - Prevent ghost verification banners
 * - Prevent wrong email from being shown
 */
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
          // Clear verification state on successful sign in
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
          emailVerificationRequired: false,
          verificationEmail: null // Clear email on other errors
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
        emailVerificationRequired: false,
        verificationEmail: null // Clear email on error
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
        error: error.message || 'Failed to sign in with Google',
        emailVerificationRequired: false,
        verificationEmail: null // Clear verification state on error
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
        // Clear verification state on sign out
        emailVerificationRequired: false,
        verificationEmail: null
      })
    } catch (error: any) {
      set({ 
        loading: false, 
        error: error.message || 'Failed to sign out',
        // Still clear verification state even on error
        emailVerificationRequired: false,
        verificationEmail: null
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
    set({ 
      user, 
      loading: false,
      // Clear verification state when user is set
      emailVerificationRequired: false,
      verificationEmail: null
    })
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
      } else {
        // No session found - clear verification state
        useAuthStore.getState().clearVerificationState()
      }
      useAuthStore.getState().setLoading(false)
    })
    .catch(() => {
      useAuthStore.getState().setLoading(false)
      // Clear verification state on error
      useAuthStore.getState().clearVerificationState()
    })

  // Listen for auth changes
  auth.onAuthStateChange((event, session) => {
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
      // Clear verification state on successful sign in
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
      // Clear verification state on sign out
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
  
  // Clear verification state on page unload (tab close)
  window.addEventListener('beforeunload', () => {
    // Note: Zustand state is cleared automatically on page refresh
    // This is just for explicit cleanup if needed
  })
}