// src/stores/bookingStore.ts
// Zustand store for booking state management

import { create } from 'zustand'
import { BookingState, SlotAvailability, BookingFormData } from '../types/booking'
import { BookingService } from '../lib/services/bookingService'

interface BookingStore extends BookingState {
  // Actions
  selectSlot: (slot: SlotAvailability) => Promise<void>
  updateFormData: (data: Partial<BookingFormData>) => void
  confirmBooking: () => Promise<void>
  cancelBooking: () => Promise<void>
  resetBooking: () => void
  setError: (error: string | null) => void
  clearError: () => void
  // Timer
  timeRemaining: number
  startTimer: () => void
  stopTimer: () => void
}

const initialState: BookingState = {
  currentStep: 'select-slot',
  selectedSlot: null,
  lockId: null,
  lockExpiresAt: null,
  formData: {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  },
  booking: null,
  error: null,
  loading: false
}

export const useBookingStore = create<BookingStore>((set, get) => {
  let timerInterval: NodeJS.Timeout | null = null

  return {
    ...initialState,
    timeRemaining: 0,

    selectSlot: async (slot: SlotAvailability) => {
      set({ loading: true, error: null })
      
      try {
        // Release any existing lock
        const currentLockId = get().lockId
        if (currentLockId) {
          await BookingService.releaseSlotLock(currentLockId)
        }

        // Create new lock
        const lockId = await BookingService.createSlotLock(slot.slotId, 1)
        
        // Calculate expiry (10 minutes from now)
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
        
        set({
          selectedSlot: slot,
          lockId,
          lockExpiresAt: expiresAt,
          currentStep: 'fill-details',
          loading: false
        })

        // Start countdown timer
        get().startTimer()
      } catch (error: any) {
        set({ 
          error: error.message || 'Failed to reserve slot', 
          loading: false 
        })
        throw error
      }
    },

    updateFormData: (data: Partial<BookingFormData>) => {
      set(state => ({
        formData: { ...state.formData, ...data }
      }))
    },

    confirmBooking: async () => {
      const { lockId, formData } = get()
      
      if (!lockId) {
        throw new Error('No active slot reservation')
      }

      set({ loading: true, error: null })

      try {
        // Complete the booking
        const booking = await BookingService.completeBooking(lockId, formData)
        
        // Stop timer
        get().stopTimer()
        
        set({
          booking,
          currentStep: 'completed',
          loading: false,
          lockId: null,
          lockExpiresAt: null
        })
      } catch (error: any) {
        set({ 
          error: error.message || 'Failed to complete booking', 
          loading: false 
        })
        throw error
      }
    },

    cancelBooking: async () => {
      const { lockId } = get()
      
      if (lockId) {
        try {
          await BookingService.releaseSlotLock(lockId)
        } catch (error) {
          console.error('Failed to release lock:', error)
        }
      }

      get().stopTimer()
      set(initialState)
    },

    resetBooking: () => {
      get().stopTimer()
      set(initialState)
    },

    setError: (error: string | null) => {
      set({ error })
    },

    clearError: () => {
      set({ error: null })
    },

    startTimer: () => {
      const { lockExpiresAt } = get()
      if (!lockExpiresAt) return

      // Clear any existing timer
      get().stopTimer()

      // Update timer every second
      timerInterval = setInterval(() => {
        const remaining = BookingService.getTimeRemaining(lockExpiresAt)
        
        if (remaining <= 0) {
          // Time expired - reset booking
          get().setError('Your reservation has expired')
          get().resetBooking()
        } else {
          set({ timeRemaining: remaining })
        }
      }, 1000)
    },

    stopTimer: () => {
      if (timerInterval) {
        clearInterval(timerInterval)
        timerInterval = null
      }
      set({ timeRemaining: 0 })
    }
  }
})