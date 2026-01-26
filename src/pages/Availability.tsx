import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { Availability } from '../types/database'
import { PlusIcon, TrashIcon, ClockIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/outline'

const DAYS = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
]

export function AvailabilityPage() {
  const { user } = useAuth()
  const [availabilities, setAvailabilities] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (user) {
      fetchAvailability()
    }
  }, [user])

  async function fetchAvailability() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('availabilities')
        .select('*')
        .eq('user_id', user?.id)
        .order('day_of_week', { ascending: true })
        .order('start_time', { ascending: true })

      if (error) throw error
      setAvailabilities(data || [])
    } catch (err: any) {
      console.error('Error fetching availability:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleAddTimeSlot = (dayIndex: number) => {
    const newSlot: Partial<Availability> = {
      user_id: user?.id,
      day_of_week: dayIndex,
      start_time: '09:00:00',
      end_time: '17:00:00',
      is_enabled: true
    }
    setAvailabilities([...availabilities, newSlot as Availability])
  }

  const handleRemoveTimeSlot = (index: number) => {
    setAvailabilities(availabilities.filter((_, i) => i !== index))
  }

  const handleTimeChange = (index: number, field: 'start_time' | 'end_time', value: string) => {
    const updatedAvailabilities = [...availabilities]
    updatedAvailabilities[index] = {
      ...updatedAvailabilities[index],
      [field]: value.includes(':') && value.split(':').length === 2 ? `${value}:00` : value
    }
    setAvailabilities(updatedAvailabilities)
  }

  const handleToggleDay = (dayIndex: number) => {
    const daySlots = availabilities.filter(a => a.day_of_week === dayIndex)
    if (daySlots.length > 0) {
      // If slots exist, toggle all of them
      const allEnabled = daySlots.every(s => s.is_enabled)
      const updatedAvailabilities = availabilities.map(a => 
        a.day_of_week === dayIndex ? { ...a, is_enabled: !allEnabled } : a
      )
      setAvailabilities(updatedAvailabilities)
    } else {
      // If no slots, add a default one
      handleAddTimeSlot(dayIndex)
    }
  }

  const handleSave = async () => {
    if (!user) return
    
    try {
      setSaving(true)
      setError(null)
      setSuccess(false)

      // Delete existing availabilities for this user
      const { error: deleteError } = await supabase
        .from('availabilities')
        .delete()
        .eq('user_id', user.id)

      if (deleteError) throw deleteError

      // Insert new availabilities
      if (availabilities.length > 0) {
        const toInsert = availabilities.map(({ id, created_at, updated_at, ...rest }) => ({
          ...rest,
          user_id: user.id
        }))
        const { error: insertError } = await supabase
          .from('availabilities')
          .insert(toInsert)

        if (insertError) throw insertError
      }

      setSuccess(true)
      fetchAvailability() // Refresh to get IDs from DB
    } catch (err: any) {
      console.error('Error saving availability:', err)
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link to="/dashboard" className="text-sm text-primary-600 hover:text-primary-700 flex items-center">
          <ArrowLeftIcon className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Availability</h1>
          <p className="text-gray-600 mt-1">Set your weekly recurring schedule.</p>
        </div>
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all availability slots?')) {
              setAvailabilities([])
            }
          }}
          className="text-sm text-red-600 hover:text-red-800 font-medium"
        >
          Clear All
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 space-y-8">
          {DAYS.map((dayName, dayIndex) => {
            const daySlots = availabilities.filter(a => a.day_of_week === dayIndex)
            const isDayEnabled = daySlots.length > 0 && daySlots.some(s => s.is_enabled)
            
            return (
              <div key={dayName} className="flex flex-col md:flex-row md:items-start space-y-4 md:space-y-0 md:space-x-6 pb-6 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="w-48 flex-shrink-0 flex items-center pt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleDay(dayIndex)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${
                      isDayEnabled ? 'bg-primary-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        isDayEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className={`ml-3 font-semibold ${isDayEnabled ? 'text-gray-900' : 'text-gray-400'}`}>
                    {dayName}
                  </span>
                </div>
                
                <div className="flex-grow space-y-3">
                  {!isDayEnabled ? (
                    <span className="text-gray-400 italic text-sm pt-2 block">Unavailable</span>
                  ) : (
                    daySlots.map((slot, idx) => {
                      const globalIdx = availabilities.findIndex(a => a === slot)
                      return (
                        <div key={idx} className={`flex items-center space-x-3 ${!slot.is_enabled ? 'opacity-50' : ''}`}>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="time"
                              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                              value={slot.start_time.substring(0, 5)}
                              onChange={(e) => handleTimeChange(globalIdx, 'start_time', e.target.value)}
                            />
                          </div>
                          <span className="text-gray-500">—</span>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <ClockIcon className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                              type="time"
                              className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                              value={slot.end_time.substring(0, 5)}
                              onChange={(e) => handleTimeChange(globalIdx, 'end_time', e.target.value)}
                            />
                          </div>
                          <button
                            onClick={() => handleRemoveTimeSlot(globalIdx)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )
                    })
                  )}
                </div>
                
                <div className="flex-shrink-0">
                  <button
                    onClick={() => handleAddTimeSlot(dayIndex)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="-ml-1 mr-1 h-4 w-4" />
                    Add Slot
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="flex-grow mr-4">
            {error && (
              <div className="flex items-center text-red-600 bg-red-50 px-3 py-2 rounded-md text-sm">
                <ExclamationCircleIcon className="h-5 w-5 mr-2" />
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center text-green-600 bg-green-50 px-3 py-2 rounded-md text-sm">
                <CheckCircleIcon className="h-5 w-5 mr-2" />
                Availability saved successfully!
              </div>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`btn-primary flex items-center space-x-2 ${saving ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <span>Save Availability</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
