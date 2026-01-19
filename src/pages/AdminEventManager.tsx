import { useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon,
  ChartBarIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'

export function AdminEventManager() {
  const [filter, setFilter] = useState('all') // all, active, draft, past
  const [searchTerm, setSearchTerm] = useState('')

  // Mock data - replace with real data from Supabase
  const events = [
    {
      id: 1,
      title: 'Team Standup',
      type: 'meeting',
      status: 'active',
      date: '2024-01-15',
      bookings: 8,
      maxAttendees: 10,
      createdAt: '2024-01-10'
    },
    {
      id: 2,
      title: 'Product Demo',
      type: 'presentation',
      status: 'active',
      date: '2024-01-18',
      bookings: 15,
      maxAttendees: 20,
      createdAt: '2024-01-12'
    },
    {
      id: 3,
      title: 'Workshop: React Basics',
      type: 'workshop',
      status: 'draft',
      date: '2024-01-22',
      bookings: 0,
      maxAttendees: 25,
      createdAt: '2024-01-14'
    },
    {
      id: 4,
      title: 'Client Consultation',
      type: 'consultation',
      status: 'past',
      date: '2024-01-05',
      bookings: 3,
      maxAttendees: 5,
      createdAt: '2024-01-01'
    }
  ]

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === 'all' || event.status === filter
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'draft':
        return 'bg-yellow-100 text-yellow-800'
      case 'past':
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
    }
  }

  const handleDelete = (eventId: number) => {
    if (confirm('Are you sure you want to delete this event?')) {
      // TODO: Implement delete logic with Supabase
      console.log('Deleting event:', eventId)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Event Manager</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-1">Manage all your events and bookings in one place.</p>
          </div>
          <Link to="/create-event">
            <Button variant="primary" className="flex items-center space-x-2">
              <PlusIcon className="h-5 w-5" />
              <span>Create Event</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Events</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{events.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-green-600 dark:text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Active Events</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.filter(e => e.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-yellow-600 dark:bg-yellow-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">D</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Draft Events</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.filter(e => e.status === 'draft').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-primary-600 dark:bg-primary-500 rounded flex items-center justify-center">
              <span className="text-white font-bold text-sm">B</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Bookings</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {events.reduce((sum, e) => sum + e.bookings, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow p-6 mb-6 border border-slate-200 dark:border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-4">
            {['all', 'active', 'draft', 'past'].map(status => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 ${
                  filter === status
                    ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          
          <div className="flex-1 max-w-md">
            <Input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-white dark:bg-slate-900 rounded-lg shadow overflow-hidden border border-slate-200 dark:border-slate-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead className="bg-slate-50 dark:bg-slate-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Event
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bookings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-700">
              {filteredEvents.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 dark:hover:bg-slate-800">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{event.title}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Created {new Date(event.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="capitalize text-sm text-slate-900 dark:text-slate-100">{event.type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100">
                    {new Date(event.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-slate-900 dark:text-slate-100">
                      {event.bookings}/{event.maxAttendees}
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 mt-1">
                      <div 
                        className="bg-primary-600 dark:bg-primary-500 h-2 rounded-full" 
                        style={{ width: `${(event.bookings / event.maxAttendees) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        to={`/event/${event.id}`}
                        className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 rounded"
                        title="View Event"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/edit-event/${event.id}`}
                        className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 rounded"
                        title="Edit Event"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Link>
                      <Link
                        to={`/analytics/${event.id}`}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 rounded"
                        title="View Analytics"
                      >
                        <ChartBarIcon className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400 rounded"
                        title="Delete Event"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredEvents.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
            <h3 className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">No events found</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {searchTerm ? 'Try adjusting your search terms.' : 'Get started by creating a new event.'}
            </p>
            {!searchTerm && (
              <div className="mt-6">
                <Link to="/create-event">
                  <Button variant="primary">
                    <PlusIcon className="h-5 w-5 mr-2" />
                    Create Event
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}