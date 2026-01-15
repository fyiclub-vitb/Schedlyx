import { Link } from 'react-router-dom'
import {
  ClockIcon,
  MapPinIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import type { Event } from '../types'

interface EventCardProps {
  event: Event
  showActions?: boolean
  className?: string
}

export function EventCard({ event, showActions = true, className = '' }: EventCardProps) {
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'paused':
        return 'bg-orange-100 text-orange-800'
      case 'completed':
        return 'bg-blue-100 text-blue-800'
      case 'cancelled':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'meeting':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'workshop':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'conference':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'consultation':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200'
      case 'interview':
        return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'webinar':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden ${className}`}>
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTypeColor(event.type)}`}>
                {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
              </span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {event.title}
            </h3>
          </div>
        </div>

        {/* Event Description */}
        {event.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {event.description}
          </p>
        )}

        {/* Event Details - Removed fake availability "Next: ..." */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-gray-600">
            <ClockIcon className="h-4 w-4 mr-2 text-primary-600" />
            <span>{event.duration} minutes</span>
            {event.bufferTime > 0 && (
              <span className="ml-1 text-gray-500">
                (+{event.bufferTime}min buffer)
              </span>
            )}
          </div>

          <div className="flex items-center text-sm text-gray-600">
            <MapPinIcon className="h-4 w-4 mr-2 text-primary-600" />
            <span className="truncate">
              {event.isOnline ? '🌐 Online' : event.location || 'Location TBD'}
            </span>
          </div>

          {event.maxAttendees && (
            <div className="flex items-center text-sm text-gray-600">
              <UserGroupIcon className="h-4 w-4 mr-2 text-primary-600" />
              <span>Max {event.maxAttendees} attendees</span>
            </div>
          )}
        </div>

        {/* Features Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {event.requiresApproval && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              Requires Approval
            </span>
          )}
          {event.allowCancellation && (
            <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
              Cancellable
            </span>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      {showActions && event.status === 'active' && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={`/event/${event.id}`}
              className="flex-1 text-center px-4 py-2 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors"
            >
              View Details
            </Link>
            <Link
              to={`/book/${event.id}`}
              className="flex-1 text-center px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors"
            >
              Register
            </Link>
          </div>
        </div>
      )}

      {/* Inactive States */}
      {showActions && event.status !== 'active' && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
          <div className="text-center text-sm text-gray-600">
            {event.status === 'draft' && 'Draft - Not Published'}
            {event.status === 'paused' && 'Registration Paused'}
            {event.status === 'completed' && 'Event Ended'}
            {event.status === 'cancelled' && 'Event Cancelled'}
          </div>
        </div>
      )}
    </div>
  )
}
