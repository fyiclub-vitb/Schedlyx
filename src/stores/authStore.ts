// src/stores/authStore.ts
// FIXED: Resilient auth with defensive checks, migration support, and error classification

import { create } from 'zustand'
import { User } from '../types'
import { auth } from '../lib/supabase'

// Auth error types for proper classification
export enum AuthErrorType {
  EMAIL_NOT_VERIFIED = 'EMAIL_NOT_VERIFIED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  NETWORK_ERROR = 'NETWORK_ERROR',
  OAUTH_CANCELLED = 'OAUTH_CANCELLED',
  PROFILE_SETUP_FAILED = 'PROFILE_SETUP_FAILED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  UNKNOWN = 'UNKNOWN'
}

export interface ClassifiedError {
  type: AuthErrorType
  message: string
  userMessage: string
  retryable: boolean
}

interface AuthState {
  user: User | null
  loading: boolean
  error: ClassifiedError | null
  emailVerificationRequired: boolean
  verificationEmail: string | null
  initialized: boolean
  lastAuthCheck: number | null
  
  // Actions
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: ClassifiedError | null) => void
  clearError: () => void
  clearVerificationState: () => void
  
  // Defensive checks
  rehydrateSession: () => Promise<void>
  validateAuthState: () => Promise<boolean>
}

/**
 * Classify authentication errors for better UX and debugging
 */
function classifyError(error: any): ClassifiedError {
  const message = error?.message?.toLowerCase() || ''
  
  // Email not verified
  if (message.includes('email not confirmed') || message.includes('email_not_confirmed')) {
    return {
      type: AuthErrorType.EMAIL_NOT_VERIFIED,
      message: error.message,
      userMessage: 'Please verify your email address before signing in. Check your inbox for the verification link.',
      retryable: false
    }
  }
  
  // Invalid credentials
  if (message.includes('invalid') || message.includes('incorrect')) {
    return {
      type: AuthErrorType.INVALID_CREDENTIALS,
      message: error.message,
      userMessage: 'Invalid email or password. Please try again.',
      retryable: true
    }
  }
  
  // OAuth cancelled
  if (message.includes('cancelled') || message.includes('user_cancelled')) {
    return {
      type: AuthErrorType.OAUTH_CANCELLED,
      message: error.message,
      userMessage: 'Sign in was cancelled. Please try again if you wish to continue.',
      retryable: true
    }
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return {
      type: AuthErrorType.NETWORK_ERROR,
      message: error.message,
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true
    }
  }
  
  // Session expired
  if (message.includes('expired') || message.includes('jwt')) {
    return {
      type: AuthErrorType.SESSION_EXPIRED,
      message: error.message,
      userMessage: 'Your session has expired. Please sign in again.',
      retryable: true
    }
  }
  
  // Unknown error
  return {
    type: AuthErrorType.UNKNOWN,
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true
  }
}

/**
 * Safe user metadata extraction
 */
const extractUserMetadata = (user: any): Pick<User, 'firstName' | 'lastName' | 'avatar'> => {
  const metadata = user.user_metadata || {}
  
  return {
    firstName: metadata.firstName || metadata.first_name || metadata.given_name || '',
    lastName: metadata.lastName || metadata.last_name || metadata.family_name || '',
    avatar: metadata.avatar || metadata.avatar_url || metadata.picture || undefined
  }
}

/**
 * Convert Supabase user to app User type
 */
const supabaseUserToAppUser = (supabaseUser: any): User => {
  const { firstName, lastName, avatar } = extractUserMetadata(supabaseUser)
  
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || '',
    firstName,
    lastName,
    avatar,
    createdAt: supabaseUser.created_at,
    updatedAt: supabaseUser.updated_at || supabaseUser.created_at
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  emailVerificationRequired: false,
  verificationEmail: null,
  initialized: false,
  lastAuthCheck: null,

  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signIn(email, password)
      
      if (user && session) {
        set({ 
          user: supabaseUserToAppUser(user),
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null,
          lastAuthCheck: Date.now()
        })
      }
    } catch (error: any) {
      const classified = classifyError(error)
      
      if (classified.type === AuthErrorType.EMAIL_NOT_VERIFIED) {
        set({ 
          loading: false, 
          error: classified,
          emailVerificationRequired: true,
          verificationEmail: email
        })
      } else {
        set({ 
          loading: false, 
          error: classified,
          emailVerificationRequired: false,
          verificationEmail: null
        })
      }
      throw error
    }
  },

  signUp: async (email: string, password: string, metadata = {}) => {
    set({ loading: true, error: null })
    try {
      const { user, session } = await auth.signUp(email, password, metadata)
      
      if (user && !session) {
        set({ 
          user: null,
          loading: false,
          error: null,
          emailVerificationRequired: true,
          verificationEmail: email,
          lastAuthCheck: Date.now()
        })
      } else if (user && session) {
        set({ 
          user: supabaseUserToAppUser(user),
          loading: false,
          error: null,
          emailVerificationRequired: false,
          verificationEmail: null,
          lastAuthCheck: Date.now()
        })
      }
    } catch (error: any) {
      const classified = classifyError(error)
      set({ 
        loading: false, 
        error: classified,
        emailVerificationRequired: false,
        verificationEmail: null
      })
      throw error
    }
  },

  signInWithGoogle: async () => {
    set({ loading: true, error: null })
    try {
      await auth.signInWithGoogle()
    } catch (error: any) {
      const classified = classifyError(error)
      set({ 
        loading: false, 
        error: classified,
        emailVerificationRequired: false,
        verificationEmail: null
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
        verificationEmail: null,
        lastAuthCheck: Date.now()
      })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  resetPassword: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resetPassword(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  resendVerificationEmail: async (email: string) => {
    set({ loading: true, error: null })
    try {
      await auth.resendConfirmationEmail(email)
      set({ loading: false, error: null })
    } catch (error: any) {
      const classified = classifyError(error)
      set({ loading: false, error: classified })
      throw error
    }
  },

  setUser: (user: User | null) => {
    set({ 
      user, 
      loading: false,
      emailVerificationRequired: false,
      verificationEmail: null,
      lastAuthCheck: Date.now()
    })
  },

  setLoading: (loading: boolean) => {
    set({ loading })
  },

  setError: (error: ClassifiedError | null) => {
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
  },

  // DEFENSIVE: Fallback session rehydration
  rehydrateSession: async () => {
    try {
      const { session } = await auth.getSession()
      
      if (session?.user) {
        set({ 
          user: supabaseUserToAppUser(session.user),
          loading: false,
          initialized: true,
          lastAuthCheck: Date.now()
        })
        return
      }
      
      set({ 
        user: null,
        loading: false,
        initialized: true,
        lastAuthCheck: Date.now()
      })
    } catch (error) {
      console.error('[AuthStore] Session rehydration failed:', error)
      set({ 
        user: null,
        loading: false,
        initialized: true,
        lastAuthCheck: Date.now()
      })
    }
  },

  // DEFENSIVE: Validate current auth state
  validateAuthState: async () => {
    try {
      const { session } = await auth.getSession()
      const currentUser = get().user
      
      // If we have a user but no session, sign out
      if (currentUser && !session) {
        set({ 
          user: null,
          error: {
            type: AuthErrorType.SESSION_EXPIRED,
            message: 'Session expired',
            userMessage: 'Your session has expired. Please sign in again.',
            retryable: true
          },
          lastAuthCheck: Date.now()
        })
        return false
      }
      
      // If we have a session but no user, hydrate
      if (!currentUser && session?.user) {
        set({ 
          user: supabaseUserToAppUser(session.user),
          lastAuthCheck: Date.now()
        })
        return true
      }
      
      set({ lastAuthCheck: Date.now() })
      return !!session
    } catch (error) {
      console.error('[AuthStore] Auth validation failed:', error)
      return false
    }
  }
}))

/**
 * RESILIENT: Auth initialization with fallback mechanisms
 */
if (typeof window !== 'undefined') {
  let authStateListenerInitialized = false
  let sessionHydrationTimeout: NodeJS.Timeout | null = null
  
  // PRIMARY: Auth state change listener
  const unsubscribe = auth.onAuthStateChange((event, session) => {
    console.log('[AuthStore] Auth event:', event)
    authStateListenerInitialized = true
    
    // Clear fallback timeout once listener fires
    if (sessionHydrationTimeout) {
      clearTimeout(sessionHydrationTimeout)
      sessionHydrationTimeout = null
    }
    
    if (event === 'INITIAL_SESSION') {
      if (session?.user) {
        useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
      } else {
        useAuthStore.getState().setLoading(false)
      }
      useAuthStore.setState({ initialized: true })
    } else if (event === 'SIGNED_IN' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'SIGNED_OUT') {
      useAuthStore.getState().setUser(null)
      useAuthStore.getState().clearVerificationState()
    } else if (event === 'TOKEN_REFRESHED' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
    } else if (event === 'USER_UPDATED' && session?.user) {
      useAuthStore.getState().setUser(supabaseUserToAppUser(session.user))
    }
  })
  
  // FALLBACK: If listener doesn't fire within 3 seconds, manually hydrate
  sessionHydrationTimeout = setTimeout(async () => {
    if (!authStateListenerInitialized) {
      console.warn('[AuthStore] Auth listener did not fire, falling back to manual session hydration')
      await useAuthStore.getState().rehydrateSession()
    }
  }, 3000)
  
  // DEFENSIVE: Periodic session validation (every 5 minutes)
  setInterval(async () => {
    const state = useAuthStore.getState()
    
    // Only validate if we think we're authenticated
    if (state.user && state.initialized) {
      const isValid = await state.validateAuthState()
      
      if (!isValid) {
        console.warn('[AuthStore] Session validation failed, user signed out')
      }
    }
  }, 5 * 60 * 1000) // 5 minutes
  
  // Cleanup on window unload
  window.addEventListener('beforeunload', () => {
    if (sessionHydrationTimeout) {
      clearTimeout(sessionHydrationTimeout)
    }
  })
}