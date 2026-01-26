// src/components/BookingRouteGuard.tsx
// FIX #2: Removed automatic route-based cleanup to prevent race conditions
// 
// REMOVED: Automatic lock release on route change (caused valid locks to be released)
// KEPT: Manual cleanup via Cancel button only
// 
// Why this was removed:
// - Route changes don't always mean user intent to abandon booking
// - Can trigger on new tabs, feature flags, or unexpected navigation
// - Server expiry (10 min) is sufficient cleanup mechanism
// - User can explicitly cancel via Cancel button if needed

import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useBookingStore } from '../stores/bookingStore'

/**
 * BookingRouteGuard
 * 
 * FIX #2: This component now only handles visibility-based verification
 * Does NOT automatically release locks on route changes
 * 
 * Cleanup philosophy:
 * - User intent: Cancel button releases lock immediately
 * - Server authority: Locks expire after 10 minutes automatically
 * - No heuristic cleanup: Route changes are NOT treated as abandonment
 * 
 * Usage:
 * Place this component at the root of your app (in App.tsx)
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
  const { lockId, currentStep, verifyLockValidity } = useBookingStore()

  useEffect(() => {
    // Only verify lock validity when user returns to tab
    // This handles cases where user left tab and lock may have expired
    const handleVisibilityChange = () => {
      if (!document.hidden && lockId && currentStep === 'fill-details') {
        console.log('Tab visible - verifying lock validity')
        verifyLockValidity()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [lockId, currentStep, verifyLockValidity])

  // FIX #2: REMOVED automatic cleanup on route change
  // This was causing valid locks to be released when:
  // - User opened link in new tab
  // - Router briefly changed routes during navigation
  // - Feature flags switched UI paths
  // 
  // Lock cleanup now happens ONLY via:
  // 1. Explicit Cancel button (user intent)
  // 2. Server expiry after 10 minutes (automatic)
  // 3. Successful booking completion

  return null
}

/**
 * useBookingCleanup
 * 
 * FIX #2: Removed automatic cleanup hook
 * 
 * This hook previously released locks on component unmount,
 * but that's too aggressive and caused race conditions.
 * 
 * Lock cleanup now follows this strategy:
 * - User clicks Cancel → immediate release
 * - User completes booking → lock consumed
 * - User abandons flow → server expires lock after 10 min
 * 
 * @deprecated Use explicit cancelBooking() from store instead
 */
export function useBookingCleanup() {
  // No-op - cleanup is manual only
  console.warn('useBookingCleanup is deprecated - use cancelBooking() explicitly')
}