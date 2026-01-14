// src/lib/services/bookingService.ts
// Service layer for booking operations

import { supabase } from '../supabase'
import { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking,
  TimeSlot 
} from '../../types/booking'

export class BookingService {
  /**
   * Get available slots for an event
   */
  static async getAvailableSlots(eventId: string): Promise<SlotAvailability[]> {
    const { data, error } = await supabase.rpc('get_available_slots', {
      p_event_id: eventId
    })

    if (error) throw error
    return data || []
  }

  /**
   * Create a temporary lock on a slot (holds it during booking process)
   */
  static async createSlotLock(
    slotId: string,
    quantity: number = 1,
    sessionId?: string,
    userId?: string
  ): Promise<string> {
    const { data, error } = await supabase.rpc('create_slot_lock', {
      p_slot_id: slotId,
      p_user_id: userId || null,
      p_session_id: sessionId || this.getSessionId(),
      p_quantity: quantity,
      p_lock_duration_minutes: 10
    })

    if (error) throw error
    return data
  }

  /**
   * Release a slot lock
   */
  static async releaseSlotLock(lockId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('release_slot_lock', {
      p_lock_id: lockId
    })

    if (error) throw error
    return data
  }

  /**
   * Complete the booking (convert lock to confirmed booking)
   */
  static async completeBooking(
    lockId: string,
    formData: BookingFormData
  ): Promise<ConfirmedBooking> {
    const { data, error } = await supabase.rpc('complete_slot_booking', {
      p_lock_id: lockId,
      p_first_name: formData.firstName,
      p_last_name: formData.lastName,
      p_email: formData.email,
      p_phone: formData.phone || null,
      p_notes: formData.notes || null
    })

    if (error) throw error

    // Fetch the complete booking details
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', data)
      .single()

    if (fetchError) throw fetchError
    return booking as ConfirmedBooking
  }

  /**
   * Cancel a booking
   */
  static async cancelBooking(bookingId: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('cancel_slot_booking', {
      p_booking_id: bookingId
    })

    if (error) throw error
    return data
  }

  /**
   * Get booking by reference
   */
  static async getBookingByReference(reference: string): Promise<ConfirmedBooking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*, time_slots(*), events(*)')
      .eq('booking_reference', reference)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }

    return data as ConfirmedBooking
  }

  /**
   * Generate time slots for an event
   */
  static async generateEventSlots(
    eventId: string,
    startDate: string,
    endDate: string,
    capacityPerSlot: number = 10
  ): Promise<number> {
    const { data, error } = await supabase.rpc('generate_event_slots', {
      p_event_id: eventId,
      p_start_date: startDate,
      p_end_date: endDate,
      p_capacity_per_slot: capacityPerSlot
    })

    if (error) throw error
    return data
  }

  /**
   * Get all slots for an event (admin view)
   */
  static async getEventSlots(eventId: string): Promise<TimeSlot[]> {
    const { data, error } = await supabase
      .from('time_slots')
      .select('*')
      .eq('event_id', eventId)
      .order('start_time', { ascending: true })

    if (error) throw error
    return data as TimeSlot[]
  }

  /**
   * Get or create session ID for anonymous users
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
   * Format time for display
   */
  static formatSlotTime(startTime: string, endTime: string): string {
    const start = new Date(startTime)
    const end = new Date(endTime)
    
    const options: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }
    
    return `${start.toLocaleTimeString('en-US', options)} - ${end.toLocaleTimeString('en-US', options)}`
  }

  /**
   * Calculate time remaining on lock
   */
  static getTimeRemaining(expiresAt: string): number {
    const expires = new Date(expiresAt).getTime()
    const now = Date.now()
    return Math.max(0, Math.floor((expires - now) / 1000))
  }

  /**
   * Format time remaining for display
   */
  static formatTimeRemaining(seconds: number): string {
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }
}