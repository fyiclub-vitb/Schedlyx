import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CalendarDaysIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline'
import { db, supabase } from '../lib/supabase'

// Interface for the DB row from 'time_slots'
interface TimeSlot {
  id: string;        // The UUID of the slot
  start_time: string; // The specific time (e.g. "10:00:00")
  is_locked: boolean; // Helper to disable taken slots
}

export function BookingPage() {
  const { eventId } = useParams()
  const navigate = useNavigate()
  
  // UI States
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [event, setEvent] = useState<any>(null)
  const [loadingEvent, setLoadingEvent] = useState(true)

  // Selection States
  const [selectedDate, setSelectedDate] = useState('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]) // Real DB slots
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null) // We track ID, not time string

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    notes: ''
  })

  // 1. Fetch Event Details
  useEffect(() => {
    async function fetchEvent() {
      if (!eventId) return
      try {
        const { data, error } = await db.getEvent(eventId)
        if (error) throw error
        setEvent(data)
      } catch (err) {
        setSubmitError('Could not load event.')
      } finally {
        setLoadingEvent(false)
      }
    }
    fetchEvent()
  }, [eventId])

  // 2. Fetch Real Time Slots (The Missing Piece)
  useEffect(() => {
    async function fetchSlots() {
      if (!eventId || !selectedDate) return;

      setAvailableSlots([]);
      setSelectedSlotId(null); // Reset time selection on date change

      // Query the 'time_slots' table directly
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, start_time, is_locked') // Select necessary fields
        .eq('event_id', eventId)
        .eq('date', selectedDate)
        .eq('is_booked', false) // Don't show already booked slots
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Error fetching slots:', error);
      } else {
        setAvailableSlots(data || []);
      }
    }

    fetchSlots();
  }, [eventId, selectedDate]);

  // Mock Dates (Ideally, you'd fetch available dates from DB too)
  const availableDates = [
    '2024-01-25', '2024-01-26', '2024-01-29', '2024-01-30', '2024-02-01'
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // CRITICAL: We must have a Slot ID, not just a time string
    if (!selectedSlotId) {
      setSubmitError('Please select a time slot.')
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // 3. The Backend Logic (The Reviewer's Request)
      // We pass the slot_id. The backend will handle locking and capacity.
      const payload = {
        slot_id: selectedSlotId, 
        attendee_data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            email: formData.email,
            phone: formData.phone || null,
            notes: formData.notes || null,
        }
      }

      // Call the RPC function defined in the DB
      const { error } = await supabase.rpc('complete_slot_booking', payload)

      if (error) throw error

      alert('Booking Confirmed!')
      navigate('/')
      
    } catch (err: any) {
      console.error('Booking error:', err)
      setSubmitError(err.message || 'Slot no longer available. Please choose another.')
      // Optional: Refetch slots here to update UI
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  if (loadingEvent) return <div className="p-12 text-center">Loading event...</div>
  if (!event) return <div className="p-12 text-center">Event not found</div>

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-gray-600">Secure your spot now</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {submitError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
                {submitError}
              </div>
            )}

            {/* Date Selection */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <CalendarDaysIcon className="h-5 w-5 mr-2" /> Select Date
              </h2>
              <div className="grid grid-cols-3 gap-3">
                {availableDates.map(date => (
                  <button
                    key={date}
                    type="button"
                    onClick={() => setSelectedDate(date)}
                    className={`p-3 rounded border transition-colors ${
                      selectedDate === date ? 'bg-blue-50 border-blue-500 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    {new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Selection - Fetched from DB */}
            {selectedDate && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" /> Select Time Slot
                </h2>
                
                {availableSlots.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No available slots for this date.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-3">
                    {availableSlots.map(slot => (
                      <button
                        key={slot.id} // USING THE DB ID
                        type="button"
                        onClick={() => setSelectedSlotId(slot.id)}
                        disabled={slot.is_locked} // Disable if locked by another user
                        className={`p-3 rounded border transition-colors ${
                          selectedSlotId === slot.id 
                            ? 'bg-blue-50 border-blue-500 text-blue-700' 
                            : slot.is_locked 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'hover:bg-gray-50'
                        }`}
                      >
                        {/* Format time nicely (e.g. 10:00:00 -> 10:00 AM) */}
                        {slot.start_time.slice(0, 5)} 
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            {selectedSlotId && (
              <div className="bg-white rounded-lg shadow p-6 space-y-4">
                 <h2 className="text-lg font-semibold mb-4 flex items-center">
                  <UserIcon className="h-5 w-5 mr-2" /> Your Details
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <input 
                      name="firstName" placeholder="First Name" required 
                      value={formData.firstName} onChange={handleChange}
                      className="input-field p-2 border rounded w-full"
                    />
                    <input 
                      name="lastName" placeholder="Last Name" required 
                      value={formData.lastName} onChange={handleChange}
                      className="input-field p-2 border rounded w-full"
                    />
                </div>
                <input 
                  name="email" type="email" placeholder="Email" required 
                  value={formData.email} onChange={handleChange}
                  className="input-field p-2 border rounded w-full"
                />
                 <input 
                  name="phone" placeholder="Phone (Optional)" 
                  value={formData.phone} onChange={handleChange}
                  className="input-field p-2 border rounded w-full"
                />
                <textarea
                    name="notes" rows={2} placeholder="Notes"
                    value={formData.notes} onChange={handleChange}
                    className="input-field p-2 border rounded w-full"
                />
              </div>
            )}

            {/* Submit Button */}
            {selectedSlotId && (
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full bg-blue-600 text-white p-4 rounded-lg font-bold text-lg shadow-md transition-all ${
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {isSubmitting ? 'Finalizing Booking...' : 'Confirm Booking'}
              </button>
            )}

          </form>
        </div>
        
        {/* Simple Summary Side Panel */}
        <div className="lg:col-span-1">
             <div className="bg-white p-6 rounded-lg shadow sticky top-4">
                 <h3 className="font-bold mb-2">Summary</h3>
                 <p className="text-sm text-gray-600">{event.title}</p>
                 {selectedDate && <p className="text-sm text-gray-600 mt-2">Date: {selectedDate}</p>}
                 {/* Find the selected time string to display it */}
                 {selectedSlotId && availableSlots.find(s => s.id === selectedSlotId) && (
                     <p className="text-sm text-gray-600">
                         Time: {availableSlots.find(s => s.id === selectedSlotId)?.start_time.slice(0,5)}
                     </p>
                 )}
             </div>
        </div>

      </div>
    </div>
  )
}
