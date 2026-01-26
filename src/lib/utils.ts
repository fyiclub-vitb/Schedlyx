import { type ClassValue, clsx } from 'clsx'

/**
 * Utility function to merge class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

/**
 * Format date to readable string
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }

  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format time to readable string
 * @param time - Time string in HH:MM format
 * @param timezone - Optional IANA timezone string for timezone-aware formatting
 */
export function formatTime(time: string, timezone?: string) {
  // If timezone is provided, treat time as UTC and format in that timezone
  if (timezone) {
    const utcDate = new Date(`2000-01-01T${time}:00Z`)
    return utcDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    })
  }

  // Otherwise, format in browser's local timezone
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}

/**
 * Calculate duration between two times
 */
export function calculateDuration(startTime: string, endTime: string): number {
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  return (end.getTime() - start.getTime()) / (1000 * 60) // Return minutes
}

/**
 * Generate time slots for a given duration
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  bufferTime: number = 0
): string[] {
  const slots: string[] = []
  const start = new Date(`2000-01-01T${startTime}`)
  const end = new Date(`2000-01-01T${endTime}`)
  const slotDuration = (duration + bufferTime) * 60 * 1000 // Convert to milliseconds

  let current = new Date(start)
  while (current.getTime() + (duration * 60 * 1000) <= end.getTime()) {
    slots.push(current.toTimeString().slice(0, 5))
    current = new Date(current.getTime() + slotDuration)
  }

  return slots
}

/**
 * Check if a date is in the past
 */
export function isPastDate(date: string | Date): boolean {
  return new Date(date) < new Date()
}

/**
 * Get available dates for the next N days
 */
export function getAvailableDates(
  days: number = 30,
  excludeWeekends: boolean = false,
  availableDays?: string[]
): string[] {
  const dates: string[] = []
  const today = new Date()

  for (let i = 1; i <= days; i++) {
    const date = new Date(today)
    date.setDate(today.getDate() + i)

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })

    // Skip weekends if specified
    if (excludeWeekends && (date.getDay() === 0 || date.getDay() === 6)) {
      continue
    }

    // Check if day is in available days
    if (availableDays && !availableDays.includes(dayName)) {
      continue
    }

    dates.push(date.toISOString().split('T')[0])
  }

  return dates
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Capitalize first letter of a string
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

/**
 * Truncate text to specified length
 */
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

// ============================================================================
// Timezone Utilities
// ============================================================================

/**
 * Get the user's current timezone
 * @returns IANA timezone string (e.g., 'America/New_York')
 */
export function getUserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

/**
 * Convert local date and time to UTC ISO string
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format
 * @param timezone - IANA timezone string
 * @returns UTC ISO string
 * 
 * INVARIANT: Treats (dateStr + timeStr) as wall-clock time in the specified IANA timezone.
 * Uses a deterministic, single-pass conversion with no double-shifting.
 */
export function convertToUTC(dateStr: string, timeStr: string, timezone: string): string {
  // Parse the input components (wall-clock time in the specified timezone)
  const [year, month, day] = dateStr.split('-').map(Number)
  const [hour, minute] = timeStr.split(':').map(Number)

  // Create a UTC date with these components as a starting point
  // This represents the "same numbers" but in UTC
  const utcMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const utcDate = new Date(utcMillis)

  // Now format this UTC date AS IF it were in the target timezone
  // This tells us: "what would the wall-clock time be in timezone X for this UTC moment?"
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(utcDate)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

  const tzYear = parseInt(getPart('year'))
  const tzMonth = parseInt(getPart('month'))
  const tzDay = parseInt(getPart('day'))
  const tzHour = parseInt(getPart('hour'))
  const tzMinute = parseInt(getPart('minute'))
  const tzSecond = parseInt(getPart('second'))

  // Calculate the difference between what we want and what we got
  // "We want" the input wall-clock time in the target timezone
  // "We got" the wall-clock time that our UTC guess produced in the target timezone
  const wantedMillis = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
  const gotMillis = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond, 0)

  // The offset is the difference - apply it once to correct our UTC timestamp
  const offset = wantedMillis - gotMillis
  const correctUtcMillis = utcMillis + offset

  return new Date(correctUtcMillis).toISOString()
}

/**
 * Convert UTC date string to local date and time in specified timezone
 * @param utcDateStr - UTC ISO string
 * @param timezone - IANA timezone string
 * @returns Object with local date and time strings
 */
export function convertFromUTC(
  utcDateStr: string,
  timezone: string
): { date: string; time: string } {
  const date = new Date(utcDateStr)

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })

  const parts = formatter.formatToParts(date)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const hour = getPart('hour')
  const minute = getPart('minute')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`
  }
}

/**
 * Get timezone abbreviation (e.g., 'EST', 'PST', 'GMT')
 * @param timezone - IANA timezone string
 * @param date - Optional date to get abbreviation for (handles DST)
 * @returns Timezone abbreviation
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short'
  })

  const parts = formatter.formatToParts(date)
  const timeZonePart = parts.find(part => part.type === 'timeZoneName')

  return timeZonePart?.value || timezone
}

/**
 * Format date and time with timezone information
 * @param date - Date object or ISO string
 * @param timezone - IANA timezone string
 * @param options - Additional formatting options
 * @returns Formatted date string with timezone
 */
export function formatDateTimeWithTimezone(
  date: string | Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone: timezone
  }

  return new Date(date).toLocaleString('en-US', { ...defaultOptions, ...options })
}

/**
 * Format time in a specific timezone
 * @param time - UTC ISO string or Date object (representing a UTC moment)
 * @param timezone - IANA timezone string
 * @returns Formatted time string
 * 
 * INVARIANT: Input must be a UTC moment (ISO string or Date object).
 * Never creates intermediate Date objects in browser timezone.
 */
export function formatTimeInTimezone(time: string | Date, timezone: string): string {
  let date: Date

  if (typeof time === 'string') {
    // Expect a UTC ISO string like "2024-01-15T19:30:00.000Z"
    // or a partial ISO string that Date can parse as UTC
    date = new Date(time)
  } else {
    // Date object already represents a UTC moment
    date = time
  }

  // Format this UTC moment in the target timezone
  // Single shift: UTC → target timezone
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone
  })
}

/**
 * Get timezone offset in hours
 * @param timezone - IANA timezone string
 * @param date - Optional date to get offset for (handles DST)
 * @returns Offset in hours (e.g., -5 for EST, -8 for PST)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }))
  const tzDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }))

  return (tzDate.getTime() - utcDate.getTime()) / (1000 * 60 * 60)
}

/**
 * Check if a timezone is valid
 * @param timezone - IANA timezone string to validate
 * @returns True if timezone is valid
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

// ============================================================================
// API Simulation (RPC Mocks)
// ============================================================================

import { Slot } from '../types'

/**
 * AUTHORITY INVARIANT:
 * fetchAvailableSlots returns the complete and authoritative list of bookable slots.
 * The client must treat this list as exhaustive and immutable.
 * Absence of a slot in the response means it is not bookable, regardless of UI state.
 */
export async function fetchAvailableSlots(eventId: string, date: string): Promise<Slot[]> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 600))

  // Simulate server-side slot generation (which would normally come from DB)
  // We use deterministic UUID-like IDs to prove we aren't using time strings.

  // Hardcoded Logic for simulation purposes:
  // If date is "2024-01-25", return standard slots.
  // Else return empty or minimal.

  // Note: In real app, this calls: supabase.rpc('get_available_slots', { event_id: eventId, date })

  const mockDuration = 60
  const eventTimezone = 'America/New_York'

  // Base times in Event TZ (same as before for consistency in demo)
  const times = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00']

  return times.map((time, index) => {
    const utcStart = convertToUTC(date, time, eventTimezone)
    const startDate = new Date(utcStart)
    const endDate = new Date(startDate.getTime() + mockDuration * 60 * 1000)

    return {
      // OPAQUE ID SECTION
      // We generate a fake UUID based on index to simulate DB behavior.
      // Ideally this comes from the DB directly.
      id: `slot_${date.replace(/-/g, '')}_${index}_uuid`,

      eventId: eventId,
      start: utcStart,
      end: endDate.toISOString(),
      available: true,
      availableCount: 1
    }
  })
}