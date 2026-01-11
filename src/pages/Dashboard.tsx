import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ChartBarIcon 
} from '@heroicons/react/24/outline'

export function Dashboard() {
  // Mock data - replace with real data from Supabase
  const stats = [
    { name: 'Total Events', value: '12', icon: CalendarDaysIcon, change: '+2 this week' },
    { name: 'Total Bookings', value: '89', icon: UserGroupIcon, change: '+12 this week' },
    { name: 'This Month', value: '34', icon: ChartBarIcon, change: '+8 from last month' },
  ]

  const recentEvents = [
    { id: 1, title: 'Team Standup', date: '2024-01-15', bookings: 8, status: 'active' },
    { id: 2, title: 'Product Demo', date: '2024-01-18', bookings: 15, status: 'active' },
    { id: 3, title: 'Workshop: React Basics', date: '2024-01-22', bookings: 25, status: 'draft' },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back! Here's what's happening with your events.</p>
          </div>
          <Link to="/create-event" className="btn-primary flex items-center space-x-2">
            <PlusIcon className="h-5 w-5" />
            <span>Create Event</span>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-8 w-8 text-primary-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-green-600">{stat.change}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Events */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Recent Events</h2>
            <Link to="/admin/events" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              View all
            </Link>
          </div>
        </div>
        <div className="divide-y divide-gray-200">
          {recentEvents.map((event) => (
            <div key={event.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">{event.title}</h3>
                  <p className="text-sm text-gray-600">
                    {new Date(event.date).toLocaleDateString()} • {event.bookings} bookings
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    event.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {event.status}
                  </span>
                  <Link 
                    to={`/event/${event.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link to="/create-event" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <PlusIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Create Event</h3>
              <p className="text-gray-600">Set up a new event or booking page</p>
            </div>
          </div>
        </Link>
        
        <Link to="/admin/events" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Manage Events</h3>
              <p className="text-gray-600">Edit and organize your events</p>
            </div>
          </div>
        </Link>
        
        <Link to="/analytics" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <ChartBarIcon className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <h3 className="text-lg font-medium text-gray-900">Analytics</h3>
              <p className="text-gray-600">View detailed insights and reports</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  )
}