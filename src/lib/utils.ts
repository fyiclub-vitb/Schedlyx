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
 */
export function formatTime(time: string) {
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
 */
export function convertToUTC(dateStr: string, timeStr: string, timezone: string): string {
  // Create a date string in the format that includes timezone info
  const dateTimeStr = `${dateStr}T${timeStr}:00`

  // Parse the date in the specified timezone
  const localDate = new Date(dateTimeStr)

  // Get the offset for the specified timezone at this date
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

  const parts = formatter.formatToParts(localDate)
  const getPart = (type: string) => parts.find(p => p.type === type)?.value || '0'

  // Reconstruct the date in the target timezone
  const year = getPart('year')
  const month = getPart('month')
  const day = getPart('day')
  const hour = getPart('hour')
  const minute = getPart('minute')
  const second = getPart('second')

  // Create a date object from the local time components
  const tzDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`)

  // Calculate the offset and adjust
  const offset = localDate.getTime() - tzDate.getTime()
  const utcDate = new Date(localDate.getTime() - offset)

  return utcDate.toISOString()
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
 * @param time - Time string in HH:MM format or Date object
 * @param timezone - IANA timezone string
 * @returns Formatted time string
 */
export function formatTimeInTimezone(time: string | Date, timezone: string): string {
  let date: Date

  if (typeof time === 'string') {
    date = new Date(`2000-01-01T${time}`)
  } else {
    date = time
  }

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