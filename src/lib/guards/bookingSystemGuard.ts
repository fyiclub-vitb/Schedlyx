// src/lib/guards/bookingSystemGuard.ts
// FIXED: Documented as PAGE-LEVEL pre-flight check only
// FIXED: Removed RPC check duplication - BookingService is the authority
/**
 * BookingSystemGuard - PAGE-LEVEL RPC availability check
 * 
 * ARCHITECTURAL DECISION:
 * ======================
 * This guard runs ONCE at page load as a pre-flight check.
 * It is NOT the source of truth for RPC availability.
 * 
 * AUTHORITY HIERARCHY:
 * 1. BookingService (from PR #41) - CANONICAL authority for all RPC operations
 * 2. BookingSystemGuard (this file) - UI-level early warning only
 * 
 * WHY THIS EXISTS:
 * - Prevents user from entering booking flow if system is clearly down
 * - Shows helpful error message BEFORE user selects a slot
 * - One-time check reduces unnecessary RPC calls
 * 
 * WHY THIS IS NOT AUTHORITATIVE:
 * - Page-level guards can't know real-time RPC health
 * - BookingService enforces RPC checks at operation time
 * - This is defensive UX, not security/correctness
 * 
 * WHEN TO USE:
 * - Call once in UpdatedBookingFlowPage before rendering booking UI
 * - Show friendly error if unhealthy
 * - Let BookingService handle all actual RPC operations
 * 
 * INVALIDATION:
 * - Call invalidateCache() after running migrations
 * - Call invalidateCache() when user clicks "Retry" after fixing system
 */
import { supabase } from '../supabase'

export class BookingSystemGuard {
  private static healthCheckCache: {
    isHealthy: boolean
    checkedAt: number
    error: string | null
  } | null = null

  private static readonly CACHE_DURATION = 60000 // 1 minute

  /**
   * PAGE-LEVEL pre-flight health check
   * This is NOT authoritative - BookingService is the source of truth
   */
  static async checkBookingSystemHealth(): Promise<{
    isHealthy: boolean
    error: string | null
    missingComponents: string[]
  }> {
    // Check cache
    if (
      this.healthCheckCache &&
      Date.now() - this.healthCheckCache.checkedAt < this.CACHE_DURATION
    ) {
      return {
        isHealthy: this.healthCheckCache.isHealthy,
        error: this.healthCheckCache.error,
        missingComponents: []
      }
    }

    const missingComponents: string[] = []
    let isHealthy = true
    let error: string | null = null

    try {
      // Quick smoke test - check if one critical RPC exists
      // Don't test all RPCs - that's BookingService's job
      const { error: rpcError } = await supabase.rpc('get_available_slots', {
        p_event_id: '00000000-0000-0000-0000-000000000000',
        p_session_id: 'health-check'
      })

      if (rpcError && rpcError.code === 'PGRST202') {
        missingComponents.push('get_available_slots')
        isHealthy = false
        error = 'Booking system RPCs not installed. Please run database migrations.'
      }
    } catch (err: any) {
      isHealthy = false
      error = `Booking system health check failed: ${err.message}`
      console.error('BookingSystemGuard health check error:', err)
    }

    // Cache result
    this.healthCheckCache = {
      isHealthy,
      checkedAt: Date.now(),
      error
    }

    return { isHealthy, error, missingComponents }
  }

  /**
   * Invalidate the health check cache
   * Call this after:
   * - Running database migrations
   * - User clicks "Retry" after system is fixed
   * - Switching environments
   */
  static invalidateCache() {
    this.healthCheckCache = null
  }
}