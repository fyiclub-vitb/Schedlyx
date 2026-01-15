
import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarDaysIcon, ClockIcon, UserIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import {
  getUserTimezone,
  getTimezoneAbbreviation,
  formatTimeInTimezone,
  formatDateTimeWithTimezone,
  fetchAvailableSlots // NEW: Simulated RPC
} from '../lib/utils'
import { Slot } from '../types'

export function BookingPage() {
  const { eventId } = useParams()

  // State
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null) // Full Slot object
  const [userTimezone, setUserTimezone] = useState('')
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]) // Fetched Slots
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Auto-detect user's timezone on component mount
  useEffect(() => {
    const detectedTimezone = getUserTimezone()
    setUserTimezone(detectedTimezone)
  }, [])

  // Mock data - replace with real data from Supabase
  const event = {
    id: eventId || 'evt_default',
    title: 'Product Strategy Workshop',
    duration: 120,
    type: 'workshop',
    timezone: 'America/New_York'
  }

  const availableDates = [
    '2024-01-25',
    '2024-01-26',
    '2024-01-29',
    '2024-01-30',
    '2024-02-01'
  ]

  // CHANGED: Fetched Slot Logic
  // We no longer generate slots from 'availableTimes'.
  // We fetch them from the 'DB' (simulated).
  useEffect(() => {
    async function loadSlots() {
      if (!selectedDate || !event.id) {
        setAvailableSlots([])
        return
      }

      setIsLoadingSlots(true)
      setSelectedSlot(null) // Reset selection

      try {
        // CALL AUTHORITY
        const slots = await fetchAvailableSlots(event.id, selectedDate)
        setAvailableSlots(slots)
      } catch (error) {
        console.error('Error fetching slots:', error)
        setAvailableSlots([]) // Fail safe: show nothing
      } finally {
        setIsLoadingSlots(false)
      }
    }

    loadSlots()
  }, [selectedDate, event.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSlot) return

    setIsSubmitting(true)

    try {
      // INVARIANT: Submission MUST use slot_id only.
      // We do not rely on time strings for booking authority.
      console.log('Booking submission:', {
        slot_id: selectedSlot.id, // <--- PRIMARY KEY AUTHORITY

        // Metadata (optional, for logging only)
        debug_time: selectedSlot.start,
        attendee_data: formData
      })

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      alert(`Booking Confirmed for Slot ID: ${selectedSlot.id}`)
      // navigate('/success')

    } catch (err) {
      alert('Booking failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book Your Spot</h1>
        <p className="text-gray-600 mt-1">Reserve your place for "{event.title}"</p>

        {/* Timezone Banner */}
        {userTimezone && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center text-sm">
              <GlobeAltIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-blue-900">
                Times shown in your timezone: <strong>{userTimezone}</strong> ({getTimezoneAbbreviation(userTimezone)})
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" />
                Select Date
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {availableDates.map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`p-3 text-center rounded-lg border transition-colors ${selectedDate === date
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                      }`}
                  >
                    <div className="font-medium">
                      {new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  Select Time {userTimezone && `(${getTimezoneAbbreviation(userTimezone)})`}
                </h2>

                {isLoadingSlots ? (
                  <div className="text-gray-500">Loading availability...</div>
                ) : (
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                    {availableSlots.length > 0 ? (
                      availableSlots.map((slot) => {
                        // Display Logic Only
                        const displayTime = formatTimeInTimezone(slot.start, userTimezone)
                        const isSelected = selectedSlot?.id === slot.id

                        return (
                          <button
                            key={slot.id} // DB ID key
                            type="button"
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 text-center rounded-lg border transition-colors ${isSelected
                              ? 'border-primary-500 bg-primary-50 text-primary-700'
                              : 'border-gray-300 hover:border-gray-400'
                              }`}
                          >
                            {displayTime}
                          </button>
                        )
                      })
                    ) : (
                      <p className="text-gray-500 col-span-full">No slots available for this date.</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Personal Information */}
            {selectedDate && selectedSlot && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" />
                  Your Information
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={formData.firstName}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                    placeholder="Any special requirements or questions?"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedDate && selectedSlot && (
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center py-3 border border-transparent rounded-md shadow-sm text-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Confirming...' : 'Confirm Booking'}
                </button>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  You'll receive a confirmation email after booking
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6 sticky top-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Summary</h3>

            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600">Event</span>
                <p className="font-medium">{event.title}</p>
              </div>

              {selectedDate && (
                <div>
                  <span className="text-sm text-gray-600">Date</span>
                  <p className="font-medium">
                    {new Date(selectedDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}

              {selectedSlot && (
                <div>
                  <span className="text-sm text-gray-600">Time</span>
                  <p className="font-medium">
                    {formatTimeInTimezone(selectedSlot.start, userTimezone)}
                    {' '}({event.duration} minutes)
                    {userTimezone && (
                      <span className="text-sm text-gray-500 ml-1">
                        {getTimezoneAbbreviation(userTimezone)}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-600">Type</span>
                <p className="font-medium capitalize">{event.type}</p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-semibold text-green-600">Free</span>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p>• Free cancellation up to 24 hours before</p>
              <p>• Confirmation email will be sent</p>
              <p>• Add to calendar option available</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}