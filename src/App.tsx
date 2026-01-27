// src/App.tsx
// FIX #5: Corrected comment to match actual BookingRouteGuard behavior

import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EmailVerificationGuard } from './components/EmailVerificationGuard'
import { BookingRouteGuard } from './components/BookingRouteGuard'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { EmailVerification } from './pages/EmailVerification'
import { AuthCallback } from './pages/AuthCallback'
import { Dashboard } from './pages/Dashboard'
import { CreateEvent } from './pages/CreateEvent'
import { PublicEventPage } from './pages/PublicEventPage'
import { BookingPage } from './pages/BookingPage'
import { AdminEventManager } from './pages/AdminEventManager'
import { EventsList } from './pages/EventsList'

function App() {
  return (
    <Layout>
      {/* FIX #5: BookingRouteGuard ONLY verifies locks on tab visibility change
          It does NOT automatically release locks on navigation
          Lock cleanup happens via:
          1. Explicit Cancel button (user intent)
          2. Server expiry after 10 minutes (automatic)
          3. Successful booking completion */}
      <BookingRouteGuard />
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/book/:eventId" element={<BookingPage />} />
        <Route path="/events" element={<EventsList />} />
        
        {/* Email Verification Route */}
        <Route 
          path="/verify-email" 
          element={
            <EmailVerificationGuard>
              <EmailVerification />
            </EmailVerificationGuard>
          } 
        />
        
        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/create-event" 
          element={
            <ProtectedRoute>
              <CreateEvent />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin/events" 
          element={
            <ProtectedRoute>
              <AdminEventManager />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Layout>
  )
}

export default App