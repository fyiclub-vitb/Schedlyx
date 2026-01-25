// src/components/BookingRouteGuard.tsx
// FIX #4: Route change cleanup handler
// 
// This component automatically releases locks when user navigates away
// from booking pages during an active booking flow

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBookingStore } from '../stores/bookingStore'

/**
 * BookingRouteGuard
 * 
 * Automatically cleans up booking locks when user navigates away from
 * booking pages with an active lock.
 * 
 * Usage:
 * Place this component at the root of your app (in App.tsx or Layout.tsx)
 * 
 * ```tsx
 * <BrowserRouter>
 *   <BookingRouteGuard />
 *   <Routes>
 *     ...
 *   </Routes>
 * </BrowserRouter>
 * ```
 */
export function BookingRouteGuard() {
  const location = useLocation()
  const { lockId, currentStep, cleanupOnRouteChange } = useBookingStore()

  useEffect(() => {
    // Define routes that are part of the booking flow
    const bookingRoutes = [
      '/book/',      // Booking page
      '/event/',     // Event details (might lead to booking)
    ]

    const isBookingRoute = bookingRoutes.some(route => 
      location.pathname.includes(route)
    )

    // If user has an active lock but is leaving booking flow
    if (lockId && currentStep !== 'completed' && !isBookingRoute) {
      console.log('User navigating away from booking flow - releasing lock')
      cleanupOnRouteChange()
    }
  }, [location.pathname, lockId, currentStep, cleanupOnRouteChange])

  return null // This component doesn't render anything
}

/**
 * useBookingCleanup
 * 
 * Alternative hook-based approach for cleanup
 * Use this in individual booking pages if you don't want a global guard
 * 
 * Usage:
 * ```tsx
 * function BookingPage() {
 *   useBookingCleanup()
 *   // ... rest of component
 * }
 * ```
 */
export function useBookingCleanup() {
  const { lockId, cleanupOnRouteChange } = useBookingStore()

  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      if (lockId) {
        cleanupOnRouteChange()
      }
    }
  }, [lockId, cleanupOnRouteChange])
}