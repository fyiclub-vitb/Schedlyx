// src/lib/featureFlags.ts
/**
 * Feature Flags System
 * 
 * PR #41: Booking Engine flags
 * PR #40: Will extend with frontend booking flow flags
 */

export interface FeatureFlags {
  // === BOOKING ENGINE (PR #41) ===
  ENABLE_BOOKING_ENGINE: boolean
}

/**
 * Get feature flags from environment variables
 */
function getFeatureFlagsFromEnv(): Partial<FeatureFlags> {
  return {
    ENABLE_BOOKING_ENGINE: 
      import.meta.env.VITE_ENABLE_BOOKING_ENGINE === 'true',
  }
}

/**
 * Default feature flags - safe defaults for production
 */
const DEFAULT_FLAGS: FeatureFlags = {
  ENABLE_BOOKING_ENGINE: false, // Disabled by default for safe rollout
}

/**
 * Merge environment flags with defaults
 */
const envFlags = getFeatureFlagsFromEnv()
export const featureFlags: FeatureFlags = {
  ...DEFAULT_FLAGS,
  ...envFlags,
}

/**
 * Helper to check if a feature is enabled
 */
export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return featureFlags[flag]
}

/**
 * Log feature flag status on app start (development only)
 */
if (import.meta.env.DEV) {
  console.group('🚩 Feature Flags (PR #41)')
  Object.entries(featureFlags).forEach(([key, value]) => {
    const emoji = value ? '✅' : '❌'
    console.log(`${emoji} ${key}: ${value}`)
  })
  console.groupEnd()
}