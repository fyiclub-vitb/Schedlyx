// src/App.tsx

// CHANGES FOR PR #41 - BOOKING ENGINE FEATURE FLAG


import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { EmailVerificationGuard } from './components/EmailVerificationGuard'
import { BookingRouteGuard } from './components/BookingRouteGuard'
import { featureFlags } from './lib/featureFlags' 
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
      {/* Only render BookingRouteGuard when booking engine is enabled */}
      
      {/* AFTER: */}
      {featureFlags.ENABLE_BOOKING_ENGINE && <BookingRouteGuard />}
      
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/events" element={<EventsList />} />
        
        {/* Feature-gated booking route (BLOCKING ISSUE #1 RESOLVED) */}
        
        {/* AFTER: */}
        {featureFlags.ENABLE_BOOKING_ENGINE && (
          <Route path="/book/:eventId" element={<BookingPage />} />
        )}
        
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


// SUMMARY OF CHANGES:
// 1. Added: import { featureFlags } from './lib/featureFlags'
// 2. Wrapped BookingRouteGuard in: {featureFlags.ENABLE_BOOKING_ENGINE && ...}
// 3. Wrapped booking route in: {featureFlags.ENABLE_BOOKING_ENGINE && (...)}
