import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { EventCard } from '../EventCard'
import { Event } from '../../types'

const EventCardWithRouter = ({ event, showActions }: { event: Event; showActions?: boolean }) => (
  <BrowserRouter>
    <EventCard event={event} showActions={showActions} />
  </BrowserRouter>
)

const mockEvent: Event = {
  id: '1',
  userId: 'user1',
  title: 'Product Strategy Workshop',
  description: 'Learn about product strategy and roadmap planning',
  type: 'workshop',
  duration: 120,
  location: 'Conference Room A',
  isOnline: false,
  maxAttendees: 25,
  requiresApproval: true,
  allowCancellation: true,
  cancellationDeadline: 24,
  bufferTime: 15,
  status: 'active',
  availableDays: ['Monday', 'Wednesday', 'Friday'],
  timeSlots: {
    start: '09:00',
    end: '17:00'
  },
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

describe('EventCard', () => {
  it('renders event title', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Product Strategy Workshop')).toBeInTheDocument()
  })

  it('renders event description', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Learn about product strategy and roadmap planning')).toBeInTheDocument()
  })

  it('renders event type badge', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Workshop')).toBeInTheDocument()
  })

  it('renders event status badge', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders event duration', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('120 minutes')).toBeInTheDocument()
  })

  it('renders buffer time when present', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('(+15min buffer)')).toBeInTheDocument()
  })

  it('renders location', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Conference Room A')).toBeInTheDocument()
  })

  it('renders online indicator for online events', () => {
    const onlineEvent = { ...mockEvent, isOnline: true, location: 'https://zoom.us/j/123' }
    render(<EventCardWithRouter event={onlineEvent} />)
    expect(screen.getByText('🌐 Online')).toBeInTheDocument()
  })

  it('renders max attendees', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Max 25 attendees')).toBeInTheDocument()
  })

  it('renders requires approval badge', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Requires Approval')).toBeInTheDocument()
  })

  it('renders cancellation policy', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    expect(screen.getByText('Cancellable (24h notice)')).toBeInTheDocument()
  })

  it('renders action buttons for active events', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    
    expect(screen.getByText('View Details')).toBeInTheDocument()
    expect(screen.getByText('Register')).toBeInTheDocument()
  })

  it('has correct links for action buttons', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    
    const viewDetailsLink = screen.getByText('View Details').closest('a')
    const registerLink = screen.getByText('Register').closest('a')
    
    expect(viewDetailsLink).toHaveAttribute('href', '/event/1')
    expect(registerLink).toHaveAttribute('href', '/book/1')
  })

  it('hides action buttons when showActions is false', () => {
    render(<EventCardWithRouter event={mockEvent} showActions={false} />)
    
    expect(screen.queryByText('View Details')).not.toBeInTheDocument()
    expect(screen.queryByText('Register')).not.toBeInTheDocument()
  })

  it('renders draft status message', () => {
    const draftEvent = { ...mockEvent, status: 'draft' as const }
    render(<EventCardWithRouter event={draftEvent} />)
    
    expect(screen.getByText('This event is not yet published')).toBeInTheDocument()
  })

  it('renders paused status message', () => {
    const pausedEvent = { ...mockEvent, status: 'paused' as const }
    render(<EventCardWithRouter event={pausedEvent} />)
    
    expect(screen.getByText('Registration is temporarily paused')).toBeInTheDocument()
  })

  it('renders completed status message', () => {
    const completedEvent = { ...mockEvent, status: 'completed' as const }
    render(<EventCardWithRouter event={completedEvent} />)
    
    expect(screen.getByText('This event has ended')).toBeInTheDocument()
  })

  it('renders cancelled status message', () => {
    const cancelledEvent = { ...mockEvent, status: 'cancelled' as const }
    render(<EventCardWithRouter event={cancelledEvent} />)
    
    expect(screen.getByText('This event has been cancelled')).toBeInTheDocument()
  })

  it('does not render max attendees when not specified', () => {
    const eventWithoutMax = { ...mockEvent, maxAttendees: undefined }
    render(<EventCardWithRouter event={eventWithoutMax} />)
    
    expect(screen.queryByText(/Max .* attendees/)).not.toBeInTheDocument()
  })

  it('does not render description when not provided', () => {
    const eventWithoutDescription = { ...mockEvent, description: undefined }
    render(<EventCardWithRouter event={eventWithoutDescription} />)
    
    expect(screen.queryByText('Learn about product strategy and roadmap planning')).not.toBeInTheDocument()
  })

  it('applies custom className', () => {
    const { container } = render(<EventCardWithRouter event={mockEvent} />)
    const card = container.querySelector('.bg-white.rounded-lg.shadow')
    
    expect(card).toBeInTheDocument()
  })

  it('renders availability bar when maxAttendees is set', () => {
    render(<EventCardWithRouter event={mockEvent} />)
    
    expect(screen.getByText('Availability')).toBeInTheDocument()
    expect(screen.getByText(/% available/)).toBeInTheDocument()
  })
})