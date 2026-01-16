import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  CalendarDaysIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';

export function BookingPage() {
  const { eventId } = useParams();
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [isBooking, setIsBooking] = useState(false);
  const [bookingProgress, setBookingProgress] = useState(0);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: '',
  });

  // Mock data - replace with real data from Supabase
  const event = {
    id: eventId,
    title: 'Product Strategy Workshop',
    duration: 120,
    type: 'workshop',
  };

  const availableDates = [
    '2024-01-25',
    '2024-01-26',
    '2024-01-29',
    '2024-01-30',
    '2024-02-01',
  ];

  const availableTimes = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBooking(true);
    setBookingProgress(0);
    
    // Simulate booking process with progress updates
    const steps = [25, 50, 75, 100];
    const delays = [500, 800, 600, 400]; // Different delays for each step
    
    for (let i = 0; i < steps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, delays[i]));
      setBookingProgress(steps[i]);
    }
    
    // Wait a moment at 100% to show completion
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // TODO: Implement actual booking logic with Supabase here
    console.log('Booking submission:', {
      eventId,
      selectedDate,
      selectedTime,
      ...formData,
    });
    
    // Show success state
    setBookingComplete(true);
    
    // Reset after showing success for a moment
    setTimeout(() => {
      setIsBooking(false);
      setBookingComplete(false);
      setBookingProgress(0);
      
      // In a real app, you might redirect to a confirmation page here
      // navigate(`/booking-confirmation/${bookingId}`);
    }, 2000);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Format progress text for button
  const getProgressText = () => {
    if (bookingComplete) return 'Booking Confirmed!';
    if (bookingProgress >= 75) return 'Finalizing...';
    if (bookingProgress >= 50) return 'Processing...';
    if (bookingProgress >= 25) return 'Saving details...';
    return 'Confirm Booking';
  };

  return (
    <div className="max-w-4xl px-4 py-8 mx-auto sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Book Your Spot</h1>
        <p className="mt-1 text-gray-600">
          Reserve your place for "{event.title}"
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Booking Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Date Selection */}
            <div className="p-6 bg-white rounded-lg shadow">
              <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                <CalendarDaysIcon className="w-5 h-5 mr-2" />
                Select Date
              </h2>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {availableDates.map((date) => (
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
                        day: 'numeric',
                      })}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(date).toLocaleDateString('en-US', {
                        weekday: 'short',
                      })}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection */}
            {selectedDate && (
              <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                  <ClockIcon className="w-5 h-5 mr-2" />
                  Select Time
                </h2>
                <div className="grid grid-cols-3 gap-3 md:grid-cols-4">
                  {availableTimes.map((time) => (
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
              <div className="p-6 bg-white rounded-lg shadow">
                <h2 className="flex items-center mb-4 text-lg font-semibold text-gray-900">
                  <UserIcon className="w-5 h-5 mr-2" />
                  Your Information
                </h2>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      First Name *
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      required
                      className="mt-1 input-field"
                      value={formData.firstName}
                      onChange={handleChange}
                      disabled={isBooking}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Last Name *
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      required
                      className="mt-1 input-field"
                      value={formData.lastName}
                      onChange={handleChange}
                      disabled={isBooking}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      className="mt-1 input-field"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isBooking}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      className="mt-1 input-field"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isBooking}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label
                    htmlFor="notes"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Additional Notes
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    className="mt-1 input-field"
                    placeholder="Any special requirements or questions?"
                    value={formData.notes}
                    onChange={handleChange}
                    disabled={isBooking}
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            {selectedDate && selectedTime && (
              <div className="p-6 bg-white rounded-lg shadow">
                <button
                  type="submit"
                  disabled={isBooking}
                  className="relative w-full py-3 overflow-hidden text-lg transition-all duration-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-90 disabled:cursor-not-allowed"
                  style={{
                    backgroundColor: bookingComplete ? '#10b981' : '#3b82f6',
                  }}
                >
                  {/* Progress bar background */}
                  <div className="absolute inset-0 bg-primary-600"></div>
                  
                  {/* Animated progress bar */}
                  {isBooking && (
                    <div
                      className="absolute inset-0 transition-all duration-300 ease-out bg-primary-700"
                      style={{ width: `${bookingProgress}%` }}
                    />
                  )}
                  
                  {/* Content */}
                  <div className="relative flex items-center justify-center space-x-2">
                    {bookingComplete ? (
                      <>
                        <CheckCircleSolid className="w-5 h-5 text-white" />
                        <span className="font-semibold text-white">
                          {getProgressText()}
                        </span>
                      </>
                    ) : (
                      <>
                        {isBooking && (
                          <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin"></div>
                        )}
                        <span className="font-semibold text-white">
                          {getProgressText()}
                        </span>
                        {isBooking && (
                          <span className="text-sm text-white">
                            {bookingProgress}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </button>
                
                {!isBooking && (
                  <p className="mt-2 text-sm text-center text-gray-600">
                    You'll receive a confirmation email after booking
                  </p>
                )}
                
                {isBooking && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Progress:</span>
                      <span className="font-medium text-primary-600">
                        {bookingProgress}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div
                        className="bg-primary-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                        style={{ width: `${bookingProgress}%` }}
                      ></div>
                    </div>
                    <p className="mt-2 text-xs text-center text-gray-500">
                      Please don't close this window...
                    </p>
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        {/* Booking Summary */}
        <div className="lg:col-span-1">
          <div className="sticky p-6 bg-white rounded-lg shadow top-8">
            <h3 className="mb-4 text-lg font-semibold text-gray-900">
              Booking Summary
            </h3>

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
                      day: 'numeric',
                    })}
                  </p>
                </div>
              )}

              {selectedTime && (
                <div>
                  <span className="text-sm text-gray-600">Time</span>
                  <p className="font-medium">
                    {selectedTime} ({event.duration} minutes)
                  </p>
                </div>
              )}

              <div>
                <span className="text-sm text-gray-600">Type</span>
                <p className="font-medium capitalize">{event.type}</p>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <span className="text-lg font-semibold">Total</span>
                <span className="text-lg font-semibold text-primary-600">
                  Free
                </span>
              </div>
            </div>

            <div className="mt-6 text-sm text-gray-600">
              <p>• Free cancellation up to 24 hours before</p>
              <p>• Confirmation email will be sent</p>
              <p>• Add to calendar option available</p>
            </div>
            
            {isBooking && (
              <div className="p-4 mt-6 border border-blue-200 rounded-lg bg-blue-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 mr-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <p className="text-sm font-medium text-blue-700">
                    Processing your booking...
                  </p>
                </div>
                <p className="mt-1 text-xs text-blue-600">
                  This usually takes just a few seconds
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}