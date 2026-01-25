// src/stores/bookingStore.ts
// FIX #4: Added page unload and lifecycle handling for lock cleanup

import { create } from 'zustand'
import { BookingService, BookingAdminService, BookingError, BookingErrorType } from '../lib/services/bookingService'

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
  // FIX #4: Added cleanup methods
  cleanupOnUnload: () => void
  cleanupOnRouteChange: () => void
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
  
  // FIX #4: Track if cleanup has been registered
  let cleanupRegistered = false

  /**
   * FIX #4: Register cleanup handlers on first use
   * Automatically releases locks on page unload or tab close
   */
  const registerCleanupHandlers = () => {
    if (cleanupRegistered) return
    cleanupRegistered = true

    // Handle page unload / tab close
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        const state = get()
        if (state.lockId) {
          // Use sendBeacon for reliable delivery during unload
          // Falls back to synchronous call if sendBeacon unavailable
          const cleanupPayload = JSON.stringify({
            lockId: state.lockId,
            timestamp: Date.now()
          })
          
          if (navigator.sendBeacon) {
            // This is the most reliable way to release locks on unload
            // Note: Actual release happens via RPC in a separate request
            navigator.sendBeacon(
              '/api/cleanup-lock', // You'd need to implement this endpoint
              cleanupPayload
            )
          }
          
          // Attempt synchronous release (may not complete before unload)
          BookingService.releaseSlotLock(state.lockId).catch(() => {
            // Ignore errors - server will expire lock anyway
          })
        }
      })

      // Handle page visibility changes (tab hidden)
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          const state = get()
          if (state.lockId && state.currentStep === 'fill-details') {
            // User left tab - verify lock is still valid when they return
            // Don't release immediately as they might come back
            console.log('Tab hidden with active lock - will verify on return')
          }
        } else {
          // User returned - verify lock is still valid
          const state = get()
          if (state.lockId && state.currentStep === 'fill-details') {
            get().verifyLockValidity()
          }
        }
      })
    }
  }

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
     * FIX #3: Strictly linear slot selection with client-side validation
     */
    selectSlot: async (slot: SlotAvailability, quantity: number) => {
      // FIX #4: Register cleanup handlers on first booking attempt
      registerCleanupHandlers()

      // FIX #3: Client-side validation BEFORE calling service
      if (!Number.isInteger(quantity) || quantity <= 0) {
        set({
          error: `Invalid quantity: ${quantity}. Please select a valid number of seats.`,
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }

      // FIX #3: Check if quantity exceeds availability
      if (quantity > slot.availableCount) {
        set({
          error: `Only ${slot.availableCount} seat${slot.availableCount === 1 ? '' : 's'} available. You selected ${quantity}.`,
          errorType: BookingErrorType.SLOT_FULL
        })
        return
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
        // FIX #3: Pass availableCount for client-side validation
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity,
          slot.availableCount // FIX #3: Required parameter
        )
        
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
        
        // Start countdown timer (UX-only)
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            set({ timeRemaining: remaining })
            
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
     * Atomic booking confirmation
     */
    confirmBooking: async () => {
      const { lockId, formData, selectedQuantity } = get()
      
      if (!lockId) {
        set({ 
          error: 'No active reservation found',
          errorType: BookingErrorType.LOCK_INVALID
        })
        return
      }
      
      if (!selectedQuantity || selectedQuantity <= 0) {
        set({
          error: 'Invalid booking quantity. Please start over.',
          errorType: BookingErrorType.INVALID_QUANTITY
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Clear timer on success
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null,
          errorType: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        if (error instanceof BookingError) {
          if (error.type === BookingErrorType.LOCK_EXPIRED ||
              error.type === BookingErrorType.CAPACITY_CHANGED ||
              error.type === BookingErrorType.SLOT_FULL) {
            
            // Clear timer
            if (timerIntervalId) {
              clearInterval(timerIntervalId)
              timerIntervalId = null
            }
            
            // Reset to slot selection
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
            set({
              loading: false,
              error: error.message,
              errorType: error.type
            })
          }
        } else {
          set({
            loading: false,
            error: error.message || 'Failed to complete booking. Please try again.',
            errorType: BookingErrorType.SYSTEM_ERROR
          })
        }
      }
    },

    /**
     * Server-authoritative lock verification
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
     * FIX #4: Cleanup on page unload
     * Called automatically by beforeunload handler
     */
    cleanupOnUnload: () => {
      const { lockId } = get()
      
      if (lockId) {
        // Attempt to release lock
        // Note: This may not complete before unload
        // Server will expire lock after timeout anyway
        BookingService.releaseSlotLock(lockId).catch(() => {
          // Ignore errors during unload
        })
      }
      
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
    },

    /**
     * FIX #4: Cleanup on route change
     * Call this from your router's navigation guard
     */
    cleanupOnRouteChange: () => {
      const { lockId, currentStep } = get()
      
      // Only release lock if user is leaving during booking flow
      if (lockId && currentStep !== 'completed') {
        BookingService.releaseSlotLock(lockId).catch(err => {
          console.error('Error releasing lock on route change:', err)
        })
      }
      
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // Don't reset state - let the new page handle it
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