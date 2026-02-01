import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  PlusIcon, 
  CalendarDaysIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ClockIcon 
} from '@heroicons/react/24/outline'
import { EventCard } from '../components/EventCard'
import { Event } from '../types'
import { useAuthStore } from '../stores/authStore'
import { supabase } from '../lib/supabase'

export function Dashboard() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [stats, setStats] = useState([
    { name: 'Total Events', value: '-', icon: CalendarDaysIcon, change: 'Loading...' },
    { name: 'Total Bookings', value: '-', icon: UserGroupIcon, change: 'Loading...' },
    { name: 'This Month', value: '-', icon: ChartBarIcon, change: 'Loading...' },
  ])

  useEffect(() => {
    async function loadDashboardData() {
      if (!user) return

      try {
        setLoading(true)

        // 1. Fetch User's Events
        const { data: events, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (eventError) throw eventError

        // 2. Fetch All Bookings for these events
        // We use an inner join to get bookings only for events owned by this user
        const { data: bookings, error: bookingError } = await supabase
          .from('bookings')
          .select('id, created_at, events!inner(user_id)')
          .eq('events.user_id', user.id)

        if (bookingError) throw bookingError

        // 3. Calculate Stats
        const totalEvents = events?.length || 0
        const totalBookings = bookings?.length || 0
        
        // Calculate "This Month" bookings
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        const thisMonthBookings = bookings?.filter(b => {
          const d = new Date(b.created_at)
          return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        }).length || 0

        // 4. Update State
        setStats([
          { 
            name: 'Total Events', 
            value: totalEvents.toString(), 
            icon: CalendarDaysIcon, 
            change: 'Lifetime' 
          },
          { 
            name: 'Total Bookings', 
            value: totalBookings.toString(), 
            icon: UserGroupIcon, 
            change: 'Lifetime' 
          },
          { 
            name: 'This Month', 
            value: thisMonthBookings.toString(), 
            icon: ChartBarIcon, 
            change: 'New bookings' 
          },
        ])

        // Map database events to Event type if necessary, or use directly
        // Assuming the DB schema matches the Event type loosely
        setRecentEvents(events as unknown as Event[])

      } catch (error) {
        console.error('Error loading dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">
              Welcome back, {user?.firstName}! Here's what's happening with your events.
            </p>
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

      {/* Recent Events with EventCard */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recent Events</h2>
          <Link to="/events" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
            View all events →
          </Link>
        </div>
        
        {recentEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <CalendarDaysIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events yet</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by creating your first event.</p>
            <div className="mt-6">
              <Link to="/create-event" className="btn-primary">
                <PlusIcon className="-ml-1 mr-2 h-5 w-5 inline" />
                Create Event
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

          <Link to="/availability" className="bg-white rounded-lg shadow p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <ClockIcon className="h-8 w-8 text-primary-600" />
              <div className="ml-4">
                <h3 className="text-lg font-medium text-gray-900">Availability</h3>
                <p className="text-gray-600">Set your weekly recurring schedule</p>
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
    </div>
  )
}