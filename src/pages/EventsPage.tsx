import { useEffect, useState } from 'react'
import { db } from '../lib/supabase'
import { EventCard } from '../components/EventCard'
import type { Event } from '../types'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  useEffect(() => {
    async function fetchEvents() {
      try {
        const { data, error } = await db.getPublicEvents()
        
        if (error) throw error
        
        if (data) {
          setEvents(data)
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load events')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const filteredEvents = events.filter(event => {
    const searchLower = searchTerm.toLowerCase()
    
    // SAFE CHECK: Ensure fields exist before calling methods
    const matchesTitle = event.title?.toLowerCase().includes(searchLower) ?? false
    
    const matchesDescription = event.description 
      ? event.description.toLowerCase().includes(searchLower) 
      : false // If no description, it doesn't match, but doesn't crash
      
    const matchesSearch = matchesTitle || matchesDescription
    const matchesType = selectedType === 'all' || event.type === selectedType
    
    return matchesSearch && matchesType
  })

  // Safe unique type extraction
  const eventTypes = ['all', ...new Set(events.map(e => e.type))]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Discover Events</h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse upcoming workshops, meetings, and conferences.
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search events..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="py-2 pl-3 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
        >
          {eventTypes.map(type => (
            <option key={type} value={type} className="capitalize">
              {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-500">Loading events...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-lg">
          <p className="text-red-600">Error loading events: {error}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 text-lg">No events found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEvents.map(event => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
