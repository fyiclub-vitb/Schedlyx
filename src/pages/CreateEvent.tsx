import { useState } from 'react'
import { ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Textarea } from '../components/ui/Textarea'
import { Select } from '../components/ui/Select'

export function CreateEvent() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'meeting', // meeting, workshop, conference
    duration: 30,
    location: '',
    isOnline: false,
    maxAttendees: '',
    requiresApproval: false,
    allowCancellation: true,
    cancellationDeadline: 24,
    bufferTime: 0,
    availableDays: [] as string[],
    timeSlots: {
      start: '09:00',
      end: '17:00'
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement event creation with Supabase
    console.log('Creating event:', formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleDayToggle = (day: string) => {
    setFormData(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }))
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Create New Event</h1>
        <p className="text-slate-600 dark:text-slate-300 mt-1">Set up a new event or booking page for your audience.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Event Title *"
              type="text"
              id="title"
              name="title"
              required
              placeholder="e.g., Team Standup, Product Demo"
              value={formData.title}
              onChange={handleChange}
            />
            
            <Textarea
              label="Description"
              id="description"
              name="description"
              rows={4}
              placeholder="Describe what this event is about..."
              value={formData.description}
              onChange={handleChange}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Event Type"
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
              >
                <option value="meeting">Meeting</option>
                <option value="workshop">Workshop</option>
                <option value="conference">Conference</option>
                <option value="consultation">Consultation</option>
                <option value="interview">Interview</option>
              </Select>
              
              <Input
                label="Duration (minutes)"
                type="number"
                id="duration"
                name="duration"
                min="15"
                max="480"
                step="15"
                value={formData.duration}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Location & Settings */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Location & Settings</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="isOnline"
                name="isOnline"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                checked={formData.isOnline}
                onChange={handleChange}
              />
              <label htmlFor="isOnline" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">
                This is an online event
              </label>
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                {formData.isOnline ? 'Meeting Link' : 'Location'}
              </label>
              <Input
                type="text"
                id="location"
                name="location"
                placeholder={formData.isOnline ? 'https://zoom.us/j/...' : 'Office address or venue'}
                value={formData.location}
                onChange={handleChange}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Max Attendees"
                type="number"
                id="maxAttendees"
                name="maxAttendees"
                min="1"
                placeholder="Leave empty for unlimited"
                value={formData.maxAttendees}
                onChange={handleChange}
              />
              
              <Input
                label="Buffer Time (minutes)"
                type="number"
                id="bufferTime"
                name="bufferTime"
                min="0"
                max="60"
                step="5"
                value={formData.bufferTime}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        {/* Availability */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            <ClockIcon className="h-5 w-5 inline mr-2 text-primary-600 dark:text-primary-400" />
            Availability
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
                Available Days
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {days.map(day => (
                  <label key={day} className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                      checked={formData.availableDays.includes(day)}
                      onChange={() => handleDayToggle(day)}
                    />
                    <span className="ml-2 text-sm text-slate-900 dark:text-slate-100">{day.slice(0, 3)}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Time"
                type="time"
                id="startTime"
                name="startTime"
                value={formData.timeSlots.start}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  timeSlots: { ...prev.timeSlots, start: e.target.value }
                }))}
              />
              
              <Input
                label="End Time"
                type="time"
                id="endTime"
                name="endTime"
                value={formData.timeSlots.end}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  timeSlots: { ...prev.timeSlots, end: e.target.value }
                }))}
              />
            </div>
          </div>
        </div>

        {/* Booking Options */}
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">Booking Options</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                id="requiresApproval"
                name="requiresApproval"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                checked={formData.requiresApproval}
                onChange={handleChange}
              />
              <label htmlFor="requiresApproval" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">
                Require approval for bookings
              </label>
            </div>
            
            <div className="flex items-center">
              <input
                id="allowCancellation"
                name="allowCancellation"
                type="checkbox"
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
                checked={formData.allowCancellation}
                onChange={handleChange}
              />
              <label htmlFor="allowCancellation" className="ml-2 block text-sm text-slate-900 dark:text-slate-100">
                Allow cancellations
              </label>
            </div>
            
            {formData.allowCancellation && (
              <div className="ml-6">
                <Input
                  label="Cancellation deadline (hours before event)"
                  type="number"
                  id="cancellationDeadline"
                  name="cancellationDeadline"
                  min="0"
                  max="168"
                  className="max-w-xs"
                  value={formData.cancellationDeadline}
                  onChange={handleChange}
                />
              </div>
            )}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="secondary">
            Save as Draft
          </Button>
          <Button type="submit" variant="primary">
            Create Event
          </Button>
        </div>
      </form>
    </div>
  )
}