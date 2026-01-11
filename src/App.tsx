import { BrowserRouter ,Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Login } from './pages/Login'
import { Signup } from './pages/Signup'
import { Dashboard } from './pages/Dashboard'
import { CreateEvent } from './pages/CreateEvent'
import { PublicEventPage } from './pages/PublicEventPage'
import { BookingPage } from './pages/BookingPage'
import { AdminEventManager } from './pages/AdminEventManager'
import { EventsList } from './pages/EventsList'

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/events" element={<EventsList />} />
        <Route path="/create-event" element={<CreateEvent />} />
        <Route path="/event/:eventId" element={<PublicEventPage />} />
        <Route path="/book/:eventId" element={<BookingPage />} />
        <Route path="/admin/events" element={<AdminEventManager />} />
        
      </Routes>
    </Layout>
  )
}

export default App