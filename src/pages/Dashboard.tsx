import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import {
  CalendarDaysIcon,
  UserGroupIcon,
  ClockIcon,
  ArrowRightIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import type { Event, EventType, EventStatus } from '../types';

export function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalBookings: 0,
    activeEvents: 0,
  });
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        if (!user) return;
        setLoading(true);
        setError(null);

        // 1. Fetch Events created by user
        const { data: eventsData, error: eventsError } = await supabase
          .from('events')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (eventsError) throw eventsError;

        // 2. Fetch Bookings for these events to calculate stats
        const { data: bookingsData, error: bookingsError } = await supabase
          .from('bookings')
          .select('id, event_id, status')
          .in('event_id', (eventsData || []).map(e => e.id));

        if (bookingsError) throw bookingsError;

        // Map DB response to Event interface
        const mappedEvents: Event[] = (eventsData || []).map(event => ({
          id: event.id,
          userId: event.user_id,
          title: event.title,
          description: event.description || '',
          type: event.type as EventType,
          duration: event.duration,
          location: event.location,
          isOnline: event.is_online,
          maxAttendees: event.max_attendees,
          requiresApproval: event.requires_approval,
          allowCancellation: event.allow_cancellation,
          cancellationDeadline: event.cancellation_deadline,
          bufferTime: event.buffer_time,
          status: event.status as EventStatus,
          availableDays: event.available_days,
          timeSlots: event.time_slots,
          createdAt: event.created_at,
          updatedAt: event.updated_at
        }));

        setRecentEvents(mappedEvents.slice(0, 3)); // Show top 3

        // Calculate Stats
        const activeEventsCount = eventsData.filter(e => e.status === 'active').length;

        setStats({
          totalEvents: eventsData.length,
          totalBookings: bookingsData?.length || 0,
          activeEvents: activeEventsCount,
        });

      } catch (err: any) {
        console.error('Error loading dashboard:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                Error loading dashboard: {error}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
        </h1>
        <p className="mt-2 text-gray-600">Here's what's happening with your events.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CalendarDaysIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Events</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalEvents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserGroupIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Bookings</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalBookings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Events</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.activeEvents}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Events Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex items-center justify-between">
          <h2 className="text-lg leading-6 font-medium text-gray-900">Recent Events</h2>
          <Link to="/admin/events" className="text-sm font-medium text-indigo-600 hover:text-indigo-500 flex items-center">
            View all <ArrowRightIcon className="ml-1 h-4 w-4" />
          </Link>
        </div>
        <div className="border-t border-gray-200">
          {recentEvents.length > 0 ? (
            <ul className="divide-y divide-gray-200">
              {recentEvents.map((event) => (
                <li key={event.id} className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <Link to={`/admin/events`} className="block">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <span className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                            {event.title.charAt(0)}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-indigo-600 truncate">{event.title}</div>
                          <div className="flex items-center text-sm text-gray-500">
                            <CalendarDaysIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                            Created {new Date(event.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${event.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                          {event.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No events created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}