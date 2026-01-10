import { Link } from 'react-router-dom'
import { CalendarDaysIcon, ClockIcon, MapPinIcon } from '@heroicons/react/24/outline'
import type { Event } from '../types'

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  return (
    <div className="bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      <div className="p-6 flex-1">
        <div className="flex justify-between items-start mb-4">
          <span className="inline-block px-3 py-1 bg-primary-50 text-primary-700 rounded-full text-xs font-medium uppercase tracking-wide">
            {event.type}
          </span>
          {event.isOnline && (
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
              Online
            </span>
          )}
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">
          {event.title}
        </h3>
        
        {event.description && (
          <p className="text-gray-600 mb-4 line-clamp-3 text-sm">
            {event.description}
          </p>
        )}
        
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-4 w-4 mr-2 text-gray-400" />
            {new Date(event.date).toLocaleDateString(undefined, {
              weekday: 'short',
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div className="flex items-center">
            <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
            {event.duration} mins
          </div>
          <div className="flex items-center">
            <MapPinIcon className="h-4 w-4 mr-2 text-gray-400" />
            {event.isOnline ? 'Remote' : event.location || 'Location TBD'}
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 mt-auto">
        <Link 
          to={`/event/${event.id}`}
          className="block w-full text-center bg-white border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
        >
          View Details
        </Link>
      </div>
    </div>
  )
}