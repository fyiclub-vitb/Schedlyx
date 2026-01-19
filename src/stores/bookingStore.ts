// src/stores/bookingStore.ts
// CRITICAL FIXES:
// 1. Strictly linear flow - no partial success states
// 2. Mandatory quantity validation at every step
// 3. Clear error propagation with specific types
// 4. No retries without re-fetching availability

import { create } from 'zustand'
import { BookingService, BookingError, BookingErrorType } from '../lib/services/bookingService'

interface SlotAvailability {
  slotId: string
  startTime: string
  endTime: string
  totalCapacity: number
  availableCount: number
  price: number
}

interface BookingFormData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  notes?: string
}

interface ConfirmedBooking {
  id: string
  bookingReference: string
  eventId: string
  slotId: string
  firstName: string
  lastName: string
  email: string
  phone: string | null
  date: string
  time: string
  status: string
  confirmedAt: string
  createdAt: string
}

type BookingStep = 'select-slot' | 'fill-details' | 'completed'

interface BookingState {
  currentStep: BookingStep
  selectedSlot: SlotAvailability | null
  selectedQuantity: number
  lockId: string | null
  lockExpiresAt: string | null
  formData: BookingFormData
  booking: ConfirmedBooking | null
  error: string | null
  errorType: BookingErrorType | null
  loading: boolean
  timeRemaining: number
}

interface BookingStore extends BookingState {
  selectSlot: (slot: SlotAvailability, quantity: number) => Promise<void>
  updateFormData: (data: Partial<BookingFormData>) => void
  confirmBooking: () => Promise<void>
  cancelBooking: () => void
  resetBooking: () => void
  clearError: () => void
  verifyLockValidity: () => Promise<boolean>
}

const initialFormData: BookingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
}

export const useBookingStore = create<BookingStore>((set, get) => {
  // Timer interval ID (stored outside Zustand state to avoid re-renders)
  let timerIntervalId: NodeJS.Timeout | null = null

  return {
    // Initial state
    currentStep: 'select-slot',
    selectedSlot: null,
    selectedQuantity: 1,
    lockId: null,
    lockExpiresAt: null,
    formData: initialFormData,
    booking: null,
    error: null,
    errorType: null,
    loading: false,
    timeRemaining: 0,

    /**
     * CRITICAL FIX: Strictly linear slot selection
     * 
     * Flow:
     * 1. Validate quantity (NO defaults, NO assumptions)
     * 2. Create server-side lock (atomic, capacity-checked)
     * 3. Start UX timer (display only, not authoritative)
     * 4. Move to next step ONLY on complete success
     * 
     * On ANY failure → abort immediately, surface specific error
     */
    selectSlot: async (slot: SlotAvailability, quantity: number) => {
      // CRITICAL: Validate quantity BEFORE calling service
      if (!Number.isInteger(quantity) || quantity <= 0) {
        set({
          error: `Invalid quantity: ${quantity}. Please select a valid number of seats.`,
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }

      // CRITICAL: Check if quantity exceeds availability
      if (quantity > slot.availableCount) {
        set({
          error: `Only ${slot.availableCount} seat(s) available. You selected ${quantity}.`,
          errorType: BookingErrorType.SLOT_FULL
        })
        return
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
        // CRITICAL: Create server-side lock (atomic, server-validates capacity)
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity
        )
        
        // CRITICAL: Only update state on COMPLETE success
        // NO partial success states allowed
        set({
          selectedSlot: slot,
          selectedQuantity: quantity,
          lockId,
          lockExpiresAt: expiresAt,
          currentStep: 'fill-details',
          loading: false,
          error: null,
          errorType: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // TIMER IS UX-ONLY: Shows countdown but doesn't control lock validity
        // Server is ALWAYS the authority on lock expiration
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            // Update timer display
            set({ timeRemaining: remaining })
            
            // When timer reaches zero, stop updating
            // State reset only happens on server rejection or explicit cancel
            if (remaining <= 0) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        
        // CRITICAL: Surface specific error types
        if (error instanceof BookingError) {
          set({
            loading: false,
            error: error.message,
            errorType: error.type
          })
        } else {
          set({
            loading: false,
            error: error.message || 'Failed to reserve slot. Please try again.',
            errorType: BookingErrorType.SYSTEM_ERROR
          })
        }
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    /**
     * CRITICAL FIX: Atomic booking confirmation
     * 
     * Flow:
     * 1. Verify lock exists
     * 2. Submit to server (server re-validates EVERYTHING)
     * 3. On success → complete state transition
     * 4. On failure → reset to slot selection with specific error
     * 
     * NO retries, NO partial states
     */
    confirmBooking: async () => {
      const { lockId, formData, selectedQuantity } = get()
      
      // CRITICAL: Guard against invalid state
      if (!lockId) {
        set({ 
          error: 'No active reservation found',
          errorType: BookingErrorType.LOCK_INVALID
        })
        return
      }
      
      // CRITICAL: Validate quantity hasn't been lost
      if (!selectedQuantity || selectedQuantity <= 0) {
        set({
          error: 'Invalid booking quantity. Please start over.',
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        // CRITICAL: Server validates lock expiration, capacity, and quantity
        // This is the ONLY authority on whether booking can proceed
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Clear timer on success
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        // CRITICAL: Only transition on complete success
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null,
          errorType: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        // CRITICAL: Handle specific error types
        if (error instanceof BookingError) {
          // Server rejected the booking
          if (error.type === BookingErrorType.LOCK_EXPIRED ||
              error.type === BookingErrorType.CAPACITY_CHANGED ||
              error.type === BookingErrorType.SLOT_FULL) {
            
            // Clear timer
            if (timerIntervalId) {
              clearInterval(timerIntervalId)
              timerIntervalId = null
            }
            
            // CRITICAL: Reset to slot selection - lock is invalid
            // NO retry, user must re-select slot
            set({
              error: error.message,
              errorType: error.type,
              currentStep: 'select-slot',
              selectedSlot: null,
              selectedQuantity: 1,
              lockId: null,
              lockExpiresAt: null,
              timeRemaining: 0,
              loading: false
            })
          } else {
            // Other error - keep state but show error
            set({
              loading: false,
              error: error.message,
              errorType: error.type
            })
          }
        } else {
          // Unknown error
          set({
            loading: false,
            error: error.message || 'Failed to confirm booking. Please try again.',
            errorType: BookingErrorType.SYSTEM_ERROR
          })
        }
      }
    },

    /**
     * CRITICAL FIX: Server-authoritative lock verification
     * 
     * Returns: true if lock is still valid, false otherwise
     * Side effect: Resets state if lock is invalid
     */
    verifyLockValidity: async () => {
      const { lockId } = get()
      
      if (!lockId) return false
      
      try {
        const { isValid, reason } = await BookingService.verifyLock(lockId)
        
        if (!isValid) {
          // Clear timer
          if (timerIntervalId) {
            clearInterval(timerIntervalId)
            timerIntervalId = null
          }
          
          // Reset state
          set({
            error: reason || 'Your reservation is no longer valid',
            errorType: BookingErrorType.LOCK_EXPIRED,
            currentStep: 'select-slot',
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0
          })
          return false
        }
        
        return true
      } catch (error: any) {
        console.error('Error verifying lock:', error)
        
        if (error instanceof BookingError) {
          set({
            error: error.message,
            errorType: error.type
          })
        }
        
        return false
      }
    },

    /**
     * Cancel booking flow
     * Releases server-side lock and resets state
     */
    cancelBooking: () => {
      const { lockId } = get()
      
      // Release lock on server
      if (lockId) {
        BookingService.releaseSlotLock(lockId).catch(err => {
          console.error('Error releasing lock:', err)
        })
      }
      
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // Reset to slot selection
      set({
        currentStep: 'select-slot',
        selectedSlot: null,
        selectedQuantity: 1,
        lockId: null,
        lockExpiresAt: null,
        timeRemaining: 0,
        error: null,
        errorType: null
      })
    },

    /**
     * Full reset (e.g., when leaving booking page)
     */
    resetBooking: () => {
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // Full reset
      set({
        currentStep: 'select-slot',
        selectedSlot: null,
        selectedQuantity: 1,
        lockId: null,
        lockExpiresAt: null,
        formData: initialFormData,
        booking: null,
        error: null,
        errorType: null,
        loading: false,
        timeRemaining: 0
      })
    },

    clearError: () => {
      set({ error: null, errorType: null })
    }
  }
})