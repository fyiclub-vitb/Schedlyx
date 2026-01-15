export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

export interface Event {
  id: string
  userId: string
  title: string
  description?: string
  type: EventType
  duration: number // in minutes
  location?: string
  isOnline: boolean
  maxAttendees?: number
  requiresApproval: boolean
  allowCancellation: boolean
  cancellationDeadline: number // hours before event
  bufferTime: number // minutes between bookings
  status: EventStatus
  timezone: string // IANA timezone (e.g., 'America/New_York')
  availableDays: string[]
  timeSlots: {
    start: string // Time in event creator's timezone
    end: string // Time in event creator's timezone
  }
  createdAt: string
  updatedAt: string
}

export interface Booking {
  id: string
  eventId: string
  userId?: string
  firstName: string
  lastName: string
  email: string
  phone?: string
  date: string // UTC ISO string
  time: string // UTC time in HH:MM format
  timezone: string // Attendee's IANA timezone
  localDate?: string // Display-only: date in attendee's timezone
  localTime?: string // Display-only: time in attendee's timezone
  status: BookingStatus
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface TimeSlot {
  time: string
  available: boolean
  bookingId?: string
}

export interface Slot {
  id: string
  start: string // UTC ISO string (Identity)
  end: string   // UTC ISO string
  available: boolean
}

export interface EventAnalytics {
  eventId: string
  totalBookings: number
  confirmedBookings: number
  cancelledBookings: number
  noShows: number
  attendanceRate: number
  bookingsByDate: Record<string, number>
  bookingsByTime: Record<string, number>
}

export type EventType =
  | 'meeting'
  | 'workshop'
  | 'conference'
  | 'consultation'
  | 'interview'
  | 'webinar'
  | 'other'

export type EventStatus =
  | 'draft'
  | 'active'
  | 'paused'
  | 'completed'
  | 'cancelled'

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'no_show'
  | 'completed'

export interface CalendarIntegration {
  id: string
  userId: string
  provider: 'google' | 'outlook' | 'apple'
  accessToken: string
  refreshToken: string
  calendarId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  isRead: boolean
  data?: Record<string, any>
  createdAt: string
}

export type NotificationType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'event_updated'
  | 'payment_received'
  | 'system_update'

export interface ApiResponse<T = any> {
  data?: T
  error?: string
  message?: string
  success: boolean
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Form types
export interface LoginForm {
  email: string
  password: string
  rememberMe?: boolean
}

export interface SignupForm {
  firstName: string
  lastName: string
  email: string
  password: string
  confirmPassword: string
  agreeToTerms: boolean
}

export interface EventForm {
  title: string
  description: string
  type: EventType
  duration: number
  location: string
  isOnline: boolean
  maxAttendees: string
  requiresApproval: boolean
  allowCancellation: boolean
  cancellationDeadline: number
  bufferTime: number
  availableDays: string[]
  timeSlots: {
    start: string
    end: string
  }
}

export interface BookingForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  notes: string
}