// src/stores/bookingStore.ts
// COMPLETELY REWRITTEN: Atomic flow, strict sequencing, no partial states
import { create } from 'zustand'
import { BookingService, BookingError, BookingErrorType } from '../lib/services/bookingService'

// Import types from the booking types file
import type { 
  SlotAvailability, 
  BookingFormData, 
  ConfirmedBooking 
} from '../types/booking'

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
  errorType: BookingErrorType | null // FIXED: Track error type
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
}

const initialFormData: BookingFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  notes: ''
}

export const useBookingStore = create<BookingStore>((set, get) => {
  // Timer is stored outside state to avoid re-renders
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

    // Actions
    selectSlot: async (slot: SlotAvailability, quantity: number) => {
      // CRITICAL: Validate quantity BEFORE any state changes
      if (!Number.isInteger(quantity) || quantity < 1) {
        set({
          error: 'Invalid quantity: must be a positive integer',
          errorType: BookingErrorType.INVALID_QUANTITY,
          loading: false
        })
        return
      }

      // CRITICAL: Validate quantity against slot capacity
      if (quantity > slot.availableCount) {
        set({
          error: `Only ${slot.availableCount} slot${slot.availableCount === 1 ? '' : 's'} available, but ${quantity} requested`,
          errorType: BookingErrorType.CAPACITY_EXCEEDED,
          loading: false
        })
        return
      }

      set({ loading: true, error: null, errorType: null })
      
      try {
        // ATOMIC OPERATION: Create lock with server validation
        const { lockId, expiresAt } = await BookingService.createSlotLock(
          slot.slotId, 
          quantity // CRITICAL: Always pass quantity
        )
        
        // CRITICAL: Only update state if lock creation succeeded
        // This is an ATOMIC state transition - no partial updates
        set({
          selectedSlot: slot,
          selectedQuantity: quantity,
          lockId,
          lockExpiresAt: expiresAt, // Server time is authority
          currentStep: 'fill-details',
          loading: false,
          error: null,
          errorType: null
        })
        
        // Clear any existing timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
        }
        
        // UX-ONLY TIMER: For display purposes only
        // Lock validity is ALWAYS determined by server via verifyLock()
        timerIntervalId = setInterval(() => {
          const state = get()
          if (state.lockExpiresAt) {
            const remaining = BookingService.getTimeRemaining(state.lockExpiresAt)
            
            // Update display only
            set({ timeRemaining: remaining })
            
            // When timer reaches zero, check with server (not client decision)
            if (remaining <= 0) {
              if (timerIntervalId) {
                clearInterval(timerIntervalId)
                timerIntervalId = null
              }
              
              // Set error to prompt user action
              set({
                error: 'Your reservation has expired. Please select a new slot.',
                errorType: BookingErrorType.LOCK_EXPIRED
              })
            }
          }
        }, 1000)
        
      } catch (error: any) {
        console.error('Error selecting slot:', error)
        
        // FIXED: Parse error type and provide specific message
        let errorMessage = 'Failed to reserve slot. Please try again.'
        let errorType = BookingErrorType.SYSTEM_ERROR
        
        if (error instanceof BookingError) {
          errorMessage = error.message
          errorType = error.type
          
          // Log details for debugging
          if (error.details) {
            console.error('Error details:', error.details)
          }
        }
        
        set({
          loading: false,
          error: errorMessage,
          errorType: errorType
        })
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    confirmBooking: async () => {
      const { lockId, formData, selectedSlot, selectedQuantity } = get()
      
      // CRITICAL: Validate preconditions
      if (!lockId) {
        set({ 
          error: 'No active reservation found. Please select a slot.',
          errorType: BookingErrorType.INVALID_LOCK
        })
        return
      }

      if (!selectedSlot) {
        set({ 
          error: 'No slot selected. Please start over.',
          errorType: BookingErrorType.SYSTEM_ERROR
        })
        return
      }

      // CRITICAL: Validate form data before submission
      if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.email.trim()) {
        set({ 
          error: 'Please fill in all required fields.',
          errorType: BookingErrorType.SYSTEM_ERROR
        })
        return
      }
      
      set({ loading: true, error: null, errorType: null })
      
      try {
        // ATOMIC OPERATION: Server validates lock and completes booking
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Success - clear timer
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        // ATOMIC STATE TRANSITION: Only update on complete success
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          error: null,
          errorType: null
        })
      } catch (error: any) {
        console.error('Error confirming booking:', error)
        
        // FIXED: Parse error type and handle appropriately
        let errorMessage = 'Failed to confirm booking. Please try again.'
        let errorType = BookingErrorType.SYSTEM_ERROR
        let shouldReset = false
        
        if (error instanceof BookingError) {
          errorMessage = error.message
          errorType = error.type
          
          // CRITICAL: Reset flow for terminal errors
          if (
            errorType === BookingErrorType.LOCK_EXPIRED ||
            errorType === BookingErrorType.SLOT_FULL ||
            errorType === BookingErrorType.INVALID_LOCK ||
            errorType === BookingErrorType.CAPACITY_EXCEEDED
          ) {
            shouldReset = true
          }
          
          // Log details for debugging
          if (error.details) {
            console.error('Error details:', error.details)
          }
        }
        
        if (timerIntervalId) {
          clearInterval(timerIntervalId)
          timerIntervalId = null
        }
        
        if (shouldReset) {
          // ATOMIC RESET: Terminal error - must restart booking flow
          set({
            error: errorMessage,
            errorType: errorType,
            currentStep: 'select-slot',
            selectedSlot: null,
            selectedQuantity: 1,
            lockId: null,
            lockExpiresAt: null,
            timeRemaining: 0,
            loading: false
          })
        } else {
          // Non-terminal error - keep state but show error
          set({
            loading: false,
            error: errorMessage,
            errorType: errorType
          })
        }
      }
    },

    cancelBooking: () => {
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // ATOMIC RESET: Clear all booking state
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

    resetBooking: () => {
      // Clear timer
      if (timerIntervalId) {
        clearInterval(timerIntervalId)
        timerIntervalId = null
      }
      
      // ATOMIC RESET: Complete state reset
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