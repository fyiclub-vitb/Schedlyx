import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, metadata?: Record<string, any>) => {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    })
  },

  signIn: async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({
      email,
      password
    })
  },

  signOut: async () => {
    return await supabase.auth.signOut()
  },

  getCurrentUser: () => {
    return supabase.auth.getUser()
  },

  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Database helpers
export const db = {
  // Events
  getEvents: async (userId?: string) => {
    let query = supabase.from('events').select('*')
    if (userId) {
      query = query.eq('user_id', userId)
    }
    return await query
  },

  // Helper for public events page
  getPublicEvents: async () => {
    return await supabase
      .from('events')
      .select('*')
      .eq('status', 'active')
      .order('date', { ascending: true })
  },

  getEvent: async (id: string) => {
    return await supabase.from('events').select('*').eq('id', id).single()
  },

  createEvent: async (eventData: any) => {
    return await supabase.from('events').insert(eventData).select().single()
  },

  updateEvent: async (id: string, eventData: any) => {
    return await supabase.from('events').update(eventData).eq('id', id).select().single()
  },

  deleteEvent: async (id: string) => {
    return await supabase.from('events').delete().eq('id', id)
  },

  // Bookings
  getBookings: async (eventId?: string, userId?: string) => {
    let query = supabase.from('bookings').select('*')
    if (eventId) {
      query = query.eq('event_id', eventId)
    }
    if (userId) {
      query = query.eq('user_id', userId)
    }
    return await query
  },

  createBooking: async (bookingData: any) => {
    return await supabase.from('bookings').insert(bookingData).select().single()
  },

  updateBooking: async (id: string, bookingData: any) => {
    return await supabase.from('bookings').update(bookingData).eq('id', id).select().single()
  },

  deleteBooking: async (id: string) => {
    return await supabase.from('bookings').delete().eq('id', id)
  }
}