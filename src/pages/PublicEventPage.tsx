import { useParams, Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { 
  CalendarDaysIcon, 
  ClockIcon, 
  MapPinIcon, 
  UserGroupIcon 
} from '@heroicons/react/24/outline'

// TypeScript interfaces - FIXES ALL ERRORS
interface Organizer {
  name: string
  title: string
  avatar: string
}

interface AgendaItem {
  time: string
  item: string
}

interface EventData {
  id: string
  title: string
  description: string
  type: string
  date: string
  duration: number
  location: string
  organizer: Organizer
  agenda: AgendaItem[]
  currentAttendees: number
  maxAttendees: number
  time: string
}

export function PublicEventPage() {
  const { eventId } = useParams<{ eventId: string }>()
  
  // Typed state
  const [event, setEvent] = useState<EventData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!eventId) {
      setError('No event ID provided')
      setLoading(false)
      return
    }

    fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/events?slug=eq.${eventId}&is_public=eq.true`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY!}`
      }
    })
    .then(res => res.json())
    .then(([data]) => {
      if (data) {
        setEvent({
          id: data.id,
          title: data.title || 'Untitled Event',
          description: data.description || 'No description',
          type: data.type || 'event',
          date: data.date,
          location: data.location || 'TBD',
          duration: 120,
          time: new Date(data.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
          organizer: {
            name: data.organizer_name || 'Unknown',
            title: data.organizer_title || '',
            avatar: data.organizer_avatar || 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150'
          },
          agenda: [
            { time: '14:00', item: 'Event Start' },
            { time: '16:00', item: 'Event End' }
          ],
          currentAttendees: data.current_attendees || 5,
          maxAttendees: data.max_attendees || 25
        })
      } else {
        setError('Event not found')
      }
      setLoading(false)
    })
    .catch(() => {
      setError('Failed to load event')
      setLoading(false)
    })
  }, [eventId])

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-600 mx-auto mb-4"></div>
        <p className="text-lg text-gray-600">Loading event...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
        <div className="text-red-600 text-xl mb-4">Event Not Found</div>
        <p className="text-gray-600">{error}</p>
        <Link to="/" className="mt-6 inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold">
          Back to Home
        </Link>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Event Header */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 text-white">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
              <h1 className="text-3xl font-bold mb-2">{event.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-blue-100">
                <div className="flex items-center">
                  <CalendarDaysIcon className="h-5 w-5 mr-2" />
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 mr-2" />
                  {event.time} ({event.duration} minutes)
                </div>
                <div className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-2" />
                  {event.location}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center text-blue-100 mb-2">
                <UserGroupIcon className="h-5 w-5 mr-2" />
                {event.currentAttendees}/{event.maxAttendees} registered
              </div>
              <Link 
                to={`/book/${event.id}`}
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors inline-block"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-6">
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About This Event</h2>
            <p className="text-gray-700 leading-relaxed">{event.description}</p>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Organizer</h2>
            <div className="flex items-center">
              <img 
                src={event.organizer.avatar} 
                alt={event.organizer.name}
                className="w-12 h-12 rounded-full mr-4"
              />
              <div>
                <h3 className="font-medium text-gray-900">{event.organizer.name}</h3>
                <p className="text-gray-600">{event.organizer.title}</p>
              </div>
            </div>
          </div>
          
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Agenda</h2>
            <div className="space-y-3">
              {event.agenda.map((item, index) => (
                <div key={index} className="flex items-start">
                  <div className="flex-shrink-0 w-16 text-sm font-medium text-blue-600">
                    {item.time}
                  </div>
                  <div className="text-gray-700">{item.item}</div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Registration Status</h3>
                <p className="text-gray-600">
                  {event.maxAttendees - event.currentAttendees} spots remaining
                </p>
                <div className="mt-2 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${(event.currentAttendees / event.maxAttendees) * 100}%` }}
                  />
                </div>
              </div>
              <Link 
                to={`/book/${event.id}`}
                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Register Now
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}