// src/components/booking/BookingErrorHandler.tsx
// NEW FILE: Specific error handling for booking errors

import { ExclamationTriangleIcon, ClockIcon, XCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { BookingErrorType } from '../../lib/services/bookingService'

interface BookingErrorHandlerProps {
  error: string
  errorType: BookingErrorType | null
  onRetry?: () => void
  onReset?: () => void
  onDismiss?: () => void
}

export function BookingErrorHandler({ 
  error, 
  errorType, 
  onRetry, 
  onReset,
  onDismiss 
}: BookingErrorHandlerProps) {
  const getErrorConfig = () => {
    switch (errorType) {
      case BookingErrorType.LOCK_EXPIRED:
        return {
          title: '⏰ Reservation Expired',
          icon: ClockIcon,
          color: 'yellow',
          showReset: true,
          showRetry: false,
          actionText: 'Select New Slot',
          description: 'Your slot reservation has timed out. This happens to ensure availability for all users.'
        }
      
      case BookingErrorType.SLOT_FULL:
        return {
          title: '📍 Slot No Longer Available',
          icon: XCircleIcon,
          color: 'orange',
          showReset: true,
          showRetry: false,
          actionText: 'Choose Another Slot',
          description: 'This slot was just booked by another user. Please select a different time.'
        }
      
      case BookingErrorType.CAPACITY_EXCEEDED:
        return {
          title: '👥 Insufficient Capacity',
          icon: ExclamationTriangleIcon,
          color: 'orange',
          showReset: true,
          showRetry: false,
          actionText: 'Adjust Quantity',
          description: 'The requested number of slots is not available. Try reducing the quantity or select another slot.'
        }
      
      case BookingErrorType.INVALID_QUANTITY:
        return {
          title: '❌ Invalid Quantity',
          icon: ExclamationTriangleIcon,
          color: 'red',
          showReset: false,
          showRetry: false,
          actionText: null,
          description: 'Please enter a valid number of slots.'
        }
      
      case BookingErrorType.INVALID_LOCK:
        return {
          title: '🔒 Invalid Reservation',
          icon: XCircleIcon,
          color: 'red',
          showReset: true,
          showRetry: false,
          actionText: 'Start Over',
          description: 'Your reservation could not be found. Please start the booking process again.'
        }
      
      case BookingErrorType.RPC_UNAVAILABLE:
        return {
          title: '🔧 System Maintenance',
          icon: ExclamationTriangleIcon,
          color: 'red',
          showReset: false,
          showRetry: true,
          actionText: 'Retry',
          description: 'The booking system is temporarily unavailable. Please try again in a moment.'
        }
      
      case BookingErrorType.SLOT_NOT_FOUND:
        return {
          title: '🔍 Slot Not Found',
          icon: XCircleIcon,
          color: 'orange',
          showReset: true,
          showRetry: false,
          actionText: 'Back to Selection',
          description: 'This slot is no longer available. It may have been removed or is no longer being offered.'
        }
      
      case BookingErrorType.SYSTEM_ERROR:
      default:
        return {
          title: '⚠️ Something Went Wrong',
          icon: ExclamationTriangleIcon,
          color: 'red',
          showReset: false,
          showRetry: true,
          actionText: 'Try Again',
          description: 'An unexpected error occurred. Please try again or contact support if the problem persists.'
        }
    }
  }

  const config = getErrorConfig()
  const Icon = config.icon

  const colorClasses = {
    yellow: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-300',
      text: 'text-yellow-800',
      icon: 'text-yellow-600',
      button: 'bg-yellow-600 hover:bg-yellow-700'
    },
    orange: {
      bg: 'bg-orange-50',
      border: 'border-orange-300',
      text: 'text-orange-800',
      icon: 'text-orange-600',
      button: 'bg-orange-600 hover:bg-orange-700'
    },
    red: {
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'text-red-800',
      icon: 'text-red-600',
      button: 'bg-red-600 hover:bg-red-700'
    }
  }

  const colors = colorClasses[config.color as keyof typeof colorClasses]

  return (
    <div className={`${colors.bg} border-2 ${colors.border} rounded-lg p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-300`}>
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 ${colors.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold ${colors.text} mb-2`}>
            {config.title}
          </h3>
          
          <p className={`text-sm ${colors.text} mb-2`}>
            {error}
          </p>
          
          {config.description && (
            <p className={`text-xs ${colors.text} opacity-90 mt-1`}>
              💡 {config.description}
            </p>
          )}
          
          <div className="flex gap-2 mt-4">
            {config.showReset && onReset && (
              <button
                onClick={onReset}
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg ${colors.button} transition-colors`}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {config.actionText}
              </button>
            )}
            
            {config.showRetry && onRetry && (
              <button
                onClick={onRetry}
                className={`inline-flex items-center px-4 py-2 text-white text-sm font-medium rounded-lg ${colors.button} transition-colors`}
              >
                <ArrowPathIcon className="h-4 w-4 mr-2" />
                {config.actionText}
              </button>
            )}
            
            {onDismiss && !config.showReset && !config.showRetry && (
              <button
                onClick={onDismiss}
                className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border-2 border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 ${colors.text} hover:opacity-75 transition-opacity`}
            aria-label="Dismiss"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Debug information (only in development) */}
      {process.env.NODE_ENV === 'development' && errorType && (
        <details className="mt-3 pt-3 border-t border-gray-300">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-800">
            🔍 Debug Info (Dev Only)
          </summary>
          <div className="mt-2 p-2 bg-white rounded text-xs font-mono text-gray-700">
            <div><strong>Error Type:</strong> {errorType}</div>
            <div><strong>Message:</strong> {error}</div>
          </div>
        </details>
      )}
    </div>
  )
}