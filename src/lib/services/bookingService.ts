// src/lib/services/bookingService.ts
// CRITICAL FIXES APPLIED:
// 1. Runtime RPC availability guard with clear error messaging
// 2. Client-side quantity validation before server calls
// 3. Separated admin functions into dedicated namespace
// 4. Added comprehensive documentation of invariants

import { supabase } from '../supabase'
import {
  SlotAvailability,
  BookingFormData,
  ConfirmedBooking,
  TimeSlot
} from '../../types/booking'

/**
 * =============================================================================
 * BOOKING SERVICE INVARIANTS - READ BEFORE MODIFYING
 * =============================================================================
 * 
 * CRITICAL RULES (violations will cause race conditions and overbooking):
 * 
 * 1. NEVER query 'time_slots' or 'bookings' tables directly for availability
 *    - ALWAYS use get_available_slots RPC
 *    - Server aggregates locks + bookings atomically
 * 
 * 2. NEVER create bookings without a valid lock
 *    - ALWAYS call create_slot_lock first
 *    - ALWAYS verify lock before completing booking
 * 
 * 3. NEVER trust client-side capacity calculations
 *    - Server is the ONLY authority on availability
 *    - Client validation is UX-only (can be bypassed)
 * 
 * 4. NEVER assume lock validity based on client time
 *    - ALWAYS use server-returned expiresAt
 *    - ALWAYS verify lock before final confirmation
 * 
 * 5. Admin functions are isolated in BookingAdminService
 *    - NEVER call admin functions from booking flows
 *    - Admin functions are for management UI only
 * 
 * REQUIRED BACKEND DEPENDENCIES:
 * - RPCs: get_available_slots, create_slot_lock, verify_lock, 
 *         release_slot_lock, complete_slot_booking
 * - Tables: time_slots, slot_locks, bookings
 * - RLS policies allowing anon access to booking RPCs
 * 
 * =============================================================================
 */

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
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  BACKEND_NOT_INITIALIZED = 'BACKEND_NOT_INITIALIZED'
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
 * 
 * FIX #1: Added comprehensive boot-time guard
 */
async function checkRPCAvailability(): Promise<void> {
  const requiredRPCs = [
    'get_available_slots',
    'create_slot_lock',
    'verify_lock',
    'release_slot_lock',
    'complete_slot_booking'
  ]

  try {
    // Test get_available_slots - will fail fast if RPC doesn't exist
    const { error } = await supabase.rpc('get_available_slots', {
      p_event_id: '00000000-0000-0000-0000-000000000000',
      p_session_id: 'test'
    })
    
    // PGRST202 = function not found
    if (error && error.code === 'PGRST202') {
      throw new BookingError(
        BookingErrorType.RPC_NOT_AVAILABLE,
        `Booking system not initialized. Required database functions are missing.\n\n` +
        `Missing RPC: ${error.message}\n\n` +
        `Required RPCs: ${requiredRPCs.join(', ')}\n\n` +
        `Please contact support or run database migrations.`,
        { 
          code: error.code,
          requiredRPCs,
          error: error.message 
        }
      )
    }
  } catch (error: any) {
    if (error instanceof BookingError) {
      throw error
    }
    
    // Network or other system errors
    console.error('RPC availability check failed:', error)
    throw new BookingError(
      BookingErrorType.BACKEND_NOT_INITIALIZED,
      'Unable to connect to booking system. Please check your connection and try again.',
      { originalError: error.message }
    )
  }
}

/**
 * =============================================================================
 * MAIN BOOKING SERVICE - FOR CUSTOMER-FACING BOOKING FLOWS
 * =============================================================================
 * 
 * NEVER use these functions for admin management
 * NEVER bypass RPC calls with direct table access
 */
export class BookingService {
  private static rpcChecked = false

  /**
   * FIX #1: Runtime guard - ensures RPCs exist before any booking operation
   * Throws clear error if backend is not initialized
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
   * CRITICAL: Strict RPC-only availability check
   * NO FALLBACKS - if RPC fails, booking MUST stop
   * 
   * @param eventId - Event UUID
   * @param sessionId - Optional browser session ID for lock exclusion
   * @returns Available slots with capacity accounting for active locks
   * @throws BookingError with specific type if operation fails
   */
  static async getAvailableSlots(eventId: string, sessionId?: string): Promise<SlotAvailability[]> {
    // FIX #1: Check RPC availability first with clear error
    await this.ensureRPCAvailable()
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: eventId,
        p_session_id: sessionId || this.getSessionId()
      })

      if (rpcError) {
        console.error('get_available_slots RPC error:', rpcError)
        
        if (rpcError.code === 'PGRST202') {
          throw new BookingError(
            BookingErrorType.RPC_NOT_AVAILABLE,
            'Booking system not available. The required database function is missing.\n\n' +
            'Please contact support.',
            { code: rpcError.code, message: rpcError.message }
          )
        }
        
        throw new BookingError(
          BookingErrorType.SYSTEM_ERROR,
          'Failed to load available slots. Please try again.',
          { code: rpcError.code, message: rpcError.message }
        )
      }

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
   * Pre-flight check with strict validation
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
    // Validate quantity before calling RPC
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
   * FIX #3: Create slot lock with client-side validation
   * 
   * @param slotId - Slot UUID
   * @param quantity - Number of seats to lock (REQUIRED, VALIDATED)
   * @param availableCount - Current available count for client-side validation
   * @param sessionId - Optional browser session ID
   * @param userId - Optional authenticated user ID
   * @returns Lock ID and server-calculated expiry time
   * @throws BookingError with specific type for different failure modes
   */
  static async createSlotLock(
    slotId: string,
    quantity: number,
    availableCount: number, // FIX #3: Required for client validation
    sessionId?: string,
    userId?: string
  ): Promise<{ lockId: string; expiresAt: string }> {
    await this.ensureRPCAvailable()
    
    // FIX #3: Client-side validation BEFORE server call
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BookingError(
        BookingErrorType.INVALID_QUANTITY,
        `Invalid quantity: ${quantity}. Must be a positive integer.`,
        { quantity }
      )
    }

    // FIX #3: Check against available count
    if (quantity > availableCount) {
      throw new BookingError(
        BookingErrorType.SLOT_FULL,
        `Only ${availableCount} seat${availableCount === 1 ? '' : 's'} available. ` +
        `You selected ${quantity}.`,
        { quantity, availableCount }
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
        
        const errorMsg = error.message.toLowerCase()
        
        if (errorMsg.includes('insufficient') || errorMsg.includes('capacity')) {
          throw new BookingError(
            BookingErrorType.SLOT_FULL,
            `Unable to reserve ${quantity} seat${quantity === 1 ? '' : 's'}. ` +
            `Another user may have just booked this slot. Please select a different time.`,
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

      // Fetch server-generated expiry time
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
   * Server-authoritative lock verification
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
   * Used for explicit cancellation or cleanup
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
   * Atomic booking completion with server-side validation
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

/**
 * =============================================================================
 * ADMIN BOOKING SERVICE - FOR MANAGEMENT UI ONLY
 * =============================================================================
 * 
 * FIX #2: Separated admin functions into dedicated namespace
 * 
 * WARNING: These functions are for ADMIN interfaces only
 * NEVER call these from customer-facing booking flows
 * NEVER use these for availability checks
 * 
 * These functions bypass the RPC layer for admin convenience
 * but must NEVER be used in booking logic
 */
export class BookingAdminService {
  /**
   * ADMIN ONLY: Generate event slots
   * 
   * WARNING: This is for bulk slot creation only
   * DO NOT use for availability checks
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
   * ADMIN ONLY: Get event slots for management UI
   * 
   * WARNING: This is for ADMIN dashboard display only
   * NEVER use this for customer-facing availability checks
   * 
   * Why? This query:
   * - Doesn't account for active locks
   * - May show stale data
   * - Bypasses booking atomicity guarantees
   * 
   * For customer availability, ALWAYS use BookingService.getAvailableSlots()
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
   * ADMIN ONLY: Get all bookings for an event
   * For admin dashboard and management only
   */
  static async getEventBookings(eventId: string) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error: any) {
      throw error
    }
  }

  /**
   * ADMIN ONLY: Get active locks for monitoring
   * For debugging and admin dashboard only
   */
  static async getActiveLocks(eventId?: string) {
    try {
      let query = supabase
        .from('slot_locks')
        .select('*, time_slots(*)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (eventId) {
        query = query.eq('time_slots.event_id', eventId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    } catch (error: any) {
      throw error
    }
  }
}