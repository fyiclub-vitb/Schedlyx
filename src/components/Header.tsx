import { Link } from 'react-router-dom'
import { CalendarIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../hooks/useAuth'

export function Header() {
  const { isAuthenticated } = useAuth()

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2">
            <CalendarIcon className="h-8 w-8 text-primary-600" />
            <span className="text-xl font-bold text-gray-900">Schedlyx</span>
          </Link>
          
          {isAuthenticated && (
            <nav className="hidden md:flex items-center space-x-8">
              <Link to="/dashboard" className="text-gray-700 hover:text-primary-600 transition-colors">
                Dashboard
              </Link>
              <Link to="/create-event" className="text-gray-700 hover:text-primary-600 transition-colors">
                Create Event
              </Link>
              <Link to="/admin/events" className="text-gray-700 hover:text-primary-600 transition-colors">
                Manage Events
              </Link>
            </nav>
          )}
          
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
               <Link to="/dashboard" className="btn-primary">
                 Go to Dashboard
               </Link>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600 transition-colors">
                  Login
                </Link>
                <Link to="/signup" className="btn-primary">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
