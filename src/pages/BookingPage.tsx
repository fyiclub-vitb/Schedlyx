import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'

export function BookingPage() {
  const { eventId } = useParams()
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  })

  // Mock data - replace with real data from Supabase
  const event = {
    id: eventId,
    title: 'Product Strategy Workshop',
    duration: 120,
    type: 'workshop'
  }

  const availableDates = [
    '2024-01-25',
    '2024-01-26',
    '2024-01-29',
    '2024-01-30',
    '2024-02-01'
  ]

  const availableTimes = [
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00'
  ]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement booking logic with Supabase
    console.log('Booking submission:', {
      eventId,
      selectedDate,
      selectedTime,
      ...formData
    })
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Book Your Spot</h1>
        <p className="text-gray-600 dark:text-slate-300 mt-1">Reserve your place for "{event.title}"</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
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
                        ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                        : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'
                    }`}
                  >
                    <div className="font-medium">
                      {new Date(date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-slate-400">
                      {new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
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
                          ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'border-gray-300 dark:border-slate-700 hover:border-gray-400 dark:hover:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100'
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
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-slate-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                  Your Information
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
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
              <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-gray-200 dark:border-slate-800">
                <button
                  type="submit"
                  className="btn-primary w-full text-lg py-3"
                >
                  Confirm Booking
                </button>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2 text-center">
                  You'll receive a confirmation email after booking
                </p>
              </div>
            )}
          </form>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 sticky top-8 border border-gray-200 dark:border-slate-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100 mb-4">Booking Summary</h3>
            
            <div className="space-y-3">
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">Event</span>
                <p className="font-medium text-gray-900 dark:text-slate-100">{event.title}</p>
              </div>
              
              {selectedDate && (
                <div>
                  <span className="text-sm text-gray-600 dark:text-slate-400">Date</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">
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
                  <span className="text-sm text-gray-600 dark:text-slate-400">Time</span>
                  <p className="font-medium text-gray-900 dark:text-slate-100">{selectedTime} ({event.duration} minutes)</p>
                </div>
              )}
              
              <div>
                <span className="text-sm text-gray-600 dark:text-slate-400">Type</span>
                <p className="font-medium capitalize text-gray-900 dark:text-slate-100">{event.type}</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-700">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900 dark:text-slate-100">Total</span>
                <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">Free</span>
              </div>
            </div>
            
            <div className="mt-6 text-sm text-gray-600 dark:text-slate-400">
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