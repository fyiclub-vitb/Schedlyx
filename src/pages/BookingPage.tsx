import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { db, supabase } from '../lib/supabase' // <--- Added supabase import

export function BookingPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  
  // Fixed: Only one event state declaration
  const [event, setEvent] = useState<any>(null) 
  const [loadingEvent, setLoadingEvent] = useState(true)

  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  })

  // Fetch event details on mount
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return
      
      try {
        const { data, error } = await db.getEvent(eventId)
        if (error) throw error
        if (data) {
          setEvent(data)
        }
      } catch (err) {
        console.error('Error fetching event:', err)
        setSubmitError('Could not load event details.')
      } finally {
        setLoadingEvent(false)
      }
    }

    fetchEvent()
  }, [eventId])

  // Mock available dates/times 
  const availableDates = [
    '2024-01-25', '2024-01-26', '2024-01-29', '2024-01-30', '2024-02-01'
  ]

  const availableTimes = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!eventId || !selectedDate || !selectedTime) return

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Reviewer Fix: Using RPC call instead of direct insert
      const bookingPayload = {
        event_id: eventId,
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        phone: formData.phone || null,
        date: selectedDate,
        time: selectedTime,
        notes: formData.notes || null,
        // Reviewer Fix: Removed 'status: confirmed' (Backend handles this)
      }

      // Call the Supabase RPC function 'create_booking'
      const { error } = await supabase.rpc('create_booking', bookingPayload)

      if (error) throw error

      alert('Registration successful! Check your email for details.')
      navigate('/')
      
    } catch (err: any) {
      console.error('Booking error:', err)
      // Improved error message display
      setSubmitError(err.message || 'Failed to submit registration. Please try again.')
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

  if (loadingEvent) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-gray-600">Loading event details...</p>
      </div>
    )
  }

  if (!event) {
     return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Event not found</h1>
        <p className="text-gray-600 mt-2">The event you are looking for does not exist.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book Your Spot</h1>
        <p className="text-gray-600 mt-1">Reserve your place for "{event.title}"</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {submitError && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg">
                {submitError}
              </div>
            )}

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
                    className={`p-3 text-center rounded-lg border transition-colors ${
                      selectedDate === date
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
                  Select Time
                </h2>
                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {availableTimes.map(time => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setSelectedTime(time)}
                      className={`p-3 text-center rounded-lg border transition-colors ${
                        selectedTime === time
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Personal Information */}
            {selectedDate && selectedTime && (
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
                      className="input-field mt-1"
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
                      className="input-field mt-1"
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
                      className="input-field mt-1"
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
                      className="input-field mt-1"
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
                    className="input-field mt-1"
                    placeholder="Any special requirements or questions?"
                    value={formData.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedDate && selectedTime && (
              <div className="bg-white rounded-lg shadow p-6">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  // Reviewer Fix: Merged classNames into one clean string
                  className={`w-full bg-blue-600 text-white rounded-lg text-lg py-3 font-medium transition-all hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                    isSubmitting ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
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

        {/* Booking Summary - (Unchanged) */}
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
              
              {selectedTime && (
                <div>
                  <span className="text-sm text-gray-600">Time</span>
                  <p className="font-medium">{selectedTime} ({event.duration} minutes)</p>
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
                <span className="text-lg font-semibold text-primary-600">Free</span>
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
