// src/lib/services/bookingService.ts
// CRITICAL FIXES:
// 1. NO fallbacks to direct table queries
// 2. Strict quantity validation at every step
// 3. Clear error propagation with specific types
// 4. Runtime RPC availability checks

import { supabase } from '../supabase'
import {
  SlotAvailability,
  BookingFormData,
  ConfirmedBooking,
  TimeSlot
} from '../../types/booking'

/**
 * Specific error types for better error handling
 */
export enum BookingErrorType {
  LOCK_EXPIRED = 'LOCK_EXPIRED',
  SLOT_FULL = 'SLOT_FULL',
  INVALID_QUANTITY = 'INVALID_QUANTITY',
  CAPACITY_CHANGED = 'CAPACITY_CHANGED',
  RPC_NOT_AVAILABLE = 'RPC_NOT_AVAILABLE',
  LOCK_INVALID = 'LOCK_INVALID',
  SYSTEM_ERROR = 'SYSTEM_ERROR'
}

export class BookingError extends Error {
  constructor(
    public type: BookingErrorType,
    message: string,
    public details?: any
  ) {
    super(message)
    this.name = 'BookingError'
  }
}

/**
 * Runtime check for RPC availability
 * CRITICAL: Prevents silent failures when backend is not deployed
 */
async function checkRPCAvailability(): Promise<void> {
  try {
    // Test with a dummy call - will fail fast if RPC doesn't exist
    const { error } = await supabase.rpc('get_available_slots', {
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_session_id: 'test'
    })
    
    // PGRST202 = function not found
    if (error && error.code === 'PGRST202') {
      throw new BookingError(
        BookingErrorType.RPC_NOT_AVAILABLE,
        'Booking system not available. Backend RPCs not deployed. Please run database migrations.',
        { code: error.code }
      )
    }
  } catch (error: any) {
    if (error instanceof BookingError) {
      throw error
    }
    // Other errors might be network issues, which is different
    console.error('RPC availability check failed:', error)
  }
}

export class BookingService {
  private static rpcChecked = false

  /**
   * CRITICAL: Runtime guard - ensures RPCs exist before any booking operation
   */
  private static async ensureRPCAvailable(): Promise<void> {
    if (this.rpcChecked) return
    
    await checkRPCAvailability()
    this.rpcChecked = true
  }

  /**
   * Get an event by its ID or Slug
   * NOTE: This is read-only and doesn't affect booking atomicity
   */
  static async getEventById(idOrSlug: string) {
    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug)

      let query = supabase
        .from('events')
        .select(`
          *,
          organizer:profiles!user_id (
            first_name,
            last_name,
            avatar_url,
            role
          )
        `)

      if (isUuid) {
        query = query.eq('id', idOrSlug)
      } else {
        query = query.eq('slug', idOrSlug)
      }

      const { data, error } = await query.single()

      if (error) {
        if (error.code === 'PGRST116') return null
        throw error
      }

      return data
    } catch (error: any) {
      console.error('BookingService.getEventById error:', error)
      return null
    }
  }

  /**
   * CRITICAL FIX: Strict RPC-only availability check
   * NO FALLBACKS - if RPC fails, booking MUST stop
   * 
   * @param eventId - Event UUID
   * @param sessionId - Optional browser session ID for lock exclusion
   * @returns Available slots with capacity accounting for active locks
   * @throws BookingError with specific type if operation fails
   */
  static async getAvailableSlots(eventId: string, sessionId?: string): Promise<SlotAvailability[]> {
    // CRITICAL: Check RPC availability first
    await this.ensureRPCAvailable()
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: sessionId || this.getSessionId()
      })

      // CRITICAL: NO FALLBACK - if RPC fails, throw immediately
      if (rpcError) {
        console.error('get_available_slots RPC error:', rpcError)
        
        if (rpcError.code === 'PGRST202') {
          throw new BookingError(
            BookingErrorType.RPC_NOT_AVAILABLE,
            'Booking system not available. Please contact support.',
            { code: rpcError.code, message: rpcError.message }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Failed to load available slots. Please try again.',
          { code: rpcError.code, message: rpcError.message }
        )
      }

      // CRITICAL: Validate RPC response structure
      if (!Array.isArray(rpcData)) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Invalid response from booking system',
          { received: typeof rpcData }
        )
      }

      return rpcData.map((slot: any) => ({
        slotId: slot.slot_id || slot.id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        availableCount: slot.available_count,
        price: slot.price
      }))
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.getAvailableSlots error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        'Failed to load available slots. Please refresh the page and try again.',
        { originalError: error.message }
      )
    }
  }

  /**
   * CRITICAL FIX: Pre-flight check with strict validation
   * 
   * @param eventId - Event UUID
   * @param quantity - Number of seats required (REQUIRED, no default)
   * @returns Booking eligibility with specific reason if not bookable
   * @throws BookingError if operation fails
   */
  static async canBookEvent(eventId: string, quantity: number): Promise<{
    canBook: boolean
    reason: string | null
    availableSlots: number
  }> {
    // CRITICAL: Validate quantity before calling RPC
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BookingError(
        BookingErrorType.INVALID_QUANTITY,
        `Invalid quantity: ${quantity}. Must be a positive integer.`,
        { quantity }
      )
    }

    await this.ensureRPCAvailable()
    
    try {
      const { data, error } = await supabase.rpc('can_book_event', {
        p_event_id: eventId,
        p_quantity: quantity
      })

      if (error) {
        console.error('can_book_event RPC error:', error)
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Failed to check booking eligibility',
          { code: error.code, message: error.message }
        )
      }

      if (!data || data.length === 0) {
        return {
          canBook: false,
          reason: 'Unable to verify booking eligibility',
          availableSlots: 0
        }
      }

      const result = data[0]
      return {
        canBook: result.can_book,
        reason: result.can_book ? null : result.reason,
        availableSlots: result.available_slots || 0
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.canBookEvent error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        'Failed to check booking eligibility',
        { originalError: error.message }
      )
    }
  }

  /**
   * CRITICAL FIX: Create slot lock with mandatory quantity validation
   * 
   * @param slotId - Slot UUID
   * @param quantity - Number of seats to lock (REQUIRED, VALIDATED)
   * @param sessionId - Optional browser session ID
   * @param userId - Optional authenticated user ID
   * @returns Lock ID and server-calculated expiry time
   * @throws BookingError with specific type for different failure modes
   */
  static async createSlotLock(
    slotId: string,
    quantity: number,
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string; expiresAt: string }> {
    await this.ensureRPCAvailable()
    
    // CRITICAL: Strict quantity validation - NO DEFAULTS
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BookingError(
        BookingErrorType.INVALID_QUANTITY,
        `Invalid quantity: ${quantity}. Must be a positive integer.`,
        { quantity }
      )
    }

    try {
      const { data: lockId, error } = await supabase.rpc('create_slot_lock', {
        p_slot_id: slotId,
        p_user_id: userId || null,
        p_session_id: sessionId || this.getSessionId(),
        p_quantity: quantity,
        p_lock_duration_minutes: 10
      })

      if (error) {
        console.error('create_slot_lock RPC error:', error)
        
        // Parse error message for specific failure types
        const errorMsg = error.message.toLowerCase()
        
        if (errorMsg.includes('insufficient') || errorMsg.includes('capacity')) {
          throw new BookingError(
            BookingErrorType.SLOT_FULL,
            error.message,
            { slotId, requestedQuantity: quantity }
          )
        }
        
        if (errorMsg.includes('not available') || errorMsg.includes('not found')) {
          throw new BookingError(
            BookingErrorType.CAPACITY_CHANGED,
            'Slot is no longer available. Please select a different time.',
            { slotId }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          error.message,
          { code: error.code }
        )
      }

      // CRITICAL: Fetch server-generated expiry time (NEVER trust client time)
      const { data: lockData, error: fetchError } = await supabase
        .from('slot_locks')
        .select('expires_at')
        .eq('id', lockId)
        .single()

      if (fetchError) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Failed to retrieve lock details',
          { lockId, error: fetchError.message }
        )
      }

      return {
        lockId,
        expiresAt: lockData.expires_at
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.createSlotLock error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        'Failed to reserve slot. Please try again.',
        { originalError: error.message }
      )
    }
  }

  /**
   * CRITICAL FIX: Server-authoritative lock verification
   * 
   * @param lockId - Lock UUID to verify
   * @returns Validation result with specific reason if invalid
   * @throws BookingError if operation fails
   */
  static async verifyLock(lockId: string): Promise<{
    isValid: boolean
    reason: string | null
    expiresAt: string | null
  }> {
    await this.ensureRPCAvailable()
    
    try {
      const { data, error } = await supabase.rpc('verify_lock', {
        p_lock_id: lockId
      })

      if (error) {
        console.error('verify_lock RPC error:', error)
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Failed to verify reservation',
          { lockId, error: error.message }
        )
      }

      if (!data || data.length === 0) {
        return {
          isValid: false,
          reason: 'Reservation not found',
          expiresAt: null
        }
      }

      const result = data[0]
      return {
        isValid: result.is_valid,
        reason: result.is_valid ? null : result.reason,
        expiresAt: result.expires_at
      }
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.verifyLock error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        'Failed to verify reservation',
        { originalError: error.message }
      )
    }
  }

  /**
   * Release slot lock via RPC
   */
  static async releaseSlotLock(lockId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('release_slot_lock', {
        p_lock_id: lockId
      })
      
      if (error) {
        console.error('release_slot_lock error:', error)
        return false
      }
      
      return data
    } catch (error: any) {
      console.error('BookingService.releaseSlotLock error:', error)
      return false
    }
  }

  /**
   * CRITICAL FIX: Atomic booking completion with server-side validation
   * Server re-validates EVERYTHING before confirming
   * 
   * @param lockId - Valid lock ID
   * @param formData - Booking details
   * @returns Confirmed booking with reference number
   * @throws BookingError with specific type for different failure modes
   */
  static async completeBooking(
    lockId: string,
    formData: BookingFormData
  ): Promise<ConfirmedBooking> {
    await this.ensureRPCAvailable()
    
    try {
      const { data: bookingId, error } = await supabase.rpc('complete_slot_booking', {
        p_lock_id: lockId,
        p_first_name: formData.firstName,
        p_last_name: formData.lastName,
        p_email: formData.email,
        p_phone: formData.phone || null,
        p_notes: formData.notes || null
      })

      if (error) {
        console.error('complete_slot_booking RPC error:', error)
        
        const errorMsg = error.message.toLowerCase()
        
        if (errorMsg.includes('expired') || errorMsg.includes('not found')) {
          throw new BookingError(
            BookingErrorType.LOCK_EXPIRED,
            'Your reservation has expired. Please select a new time slot.',
            { lockId }
          )
        }
        
        if (errorMsg.includes('capacity') || errorMsg.includes('insufficient')) {
          throw new BookingError(
            BookingErrorType.CAPACITY_CHANGED,
            'Slot capacity has changed. Please select a different time.',
            { lockId }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          error.message,
          { code: error.code }
        )
      }

      // Fetch complete booking details
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (fetchError) {
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Booking created but failed to retrieve details',
          { bookingId, error: fetchError.message }
        )
      }

      return {
        id: booking.id,
        bookingReference: booking.booking_reference,
        eventId: booking.event_id,
        slotId: booking.slot_id,
        firstName: booking.first_name,
        lastName: booking.last_name,
        email: booking.email,
        phone: booking.phone,
        date: booking.date,
        time: booking.time,
        status: booking.status,
        confirmedAt: booking.confirmed_at,
        createdAt: booking.created_at
      } as ConfirmedBooking
    } catch (error: any) {
      if (error instanceof BookingError) {
        throw error
      }
      
      console.error('BookingService.completeBooking error:', error)
      throw new BookingError(
        BookingErrorType.SYSTEM_ERROR,
        'Failed to complete booking. Please contact support if you were charged.',
        { originalError: error.message }
      )
    }
  }

  /**
   * ADMIN ONLY: Generate event slots
   */
  static async generateEventSlots(
    eventId: string,
    startDate: string,
    endDate: string,
    capacityPerSlot: number = 10
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('generate_event_slots', {
        p_event_id: eventId,
        p_start_date: startDate,
        p_end_date: endDate,
        p_capacity_per_slot: capacityPerSlot
      })

      if (error) throw error
      return data
    } catch (error: any) {
      throw error
    }
  }

  /**
   * ADMIN ONLY: Get event slots for management
   * WARNING: This is ONLY for admin UI - NEVER use for booking availability
   */
  static async getEventSlots(eventId: string): Promise<TimeSlot[]> {
    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('event_id', eventId)
        .order('start_time', { ascending: true })

      if (error) throw error

      return (data || []).map((slot: any) => ({
        id: slot.id,
        eventId: slot.event_id,
        startTime: slot.start_time,
        endTime: slot.end_time,
        totalCapacity: slot.total_capacity,
        bookedCount: slot.booked_count,
        availableCount: slot.available_count,
        status: slot.status,
        isLocked: slot.is_locked,
        lockedUntil: slot.locked_until,
        price: slot.price,
        currency: slot.currency,
        createdAt: slot.created_at,
        updatedAt: slot.updated_at
      }))
    } catch (error: any) {
      throw error
    }
  }

  /**
   * Get session ID for lock tracking
   */
  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('booking_session_id')
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem('booking_session_id', sessionId)
    }
    return sessionId
  }

  /**
   * Format slot time for display
   */
  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    return `${start.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}`
  }

  /**
   * Get time remaining from expiry timestamp
   */
  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    return Math.max(0, Math.floor((expires - Date.now()) / 1000))
  }
}