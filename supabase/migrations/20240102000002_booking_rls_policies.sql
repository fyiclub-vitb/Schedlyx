-- supabase/migrations/20240102000002_booking_rls_policies.sql
-- Row Level Security Policies for Booking System
-- FIXED: Proper policies for anonymous and authenticated users

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_attempts ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- TIME SLOTS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view available time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Event owners can manage time slots" ON public.time_slots;
DROP POLICY IF EXISTS "Admins can create time slots" ON public.time_slots;

-- Allow everyone (including anonymous users) to view available time slots
CREATE POLICY "Anyone can view available time slots"
  ON public.time_slots FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.status = 'active'
        AND events.visibility IN ('public', 'unlisted')
    )
  );

-- Event owners can view all their slots (including drafts)
CREATE POLICY "Event owners can view own slots"
  ON public.time_slots FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  );

-- Event owners can manage all time slots for their events
CREATE POLICY "Event owners can manage time slots"
  ON public.time_slots FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = time_slots.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- SLOT LOCKS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own slot locks" ON public.slot_locks;
DROP POLICY IF EXISTS "Anyone can create slot locks" ON public.slot_locks;
DROP POLICY IF EXISTS "Users can update own slot locks" ON public.slot_locks;

-- Users can view their own slot locks (by user_id or session_id)
CREATE POLICY "Users can view their own slot locks"
  ON public.slot_locks FOR SELECT
  TO anon, authenticated
  USING (
    user_id = auth.uid() 
    OR session_id = current_setting('request.jwt.claim.session_id', true)
  );

-- Anyone can create slot locks (needed for anonymous booking flow)
-- Capacity validation happens in RPC
CREATE POLICY "Anyone can create slot locks"
  ON public.slot_locks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Users can update their own slot locks
CREATE POLICY "Users can update own slot locks"
  ON public.slot_locks FOR UPDATE
  TO anon, authenticated
  USING (
    user_id = auth.uid() 
    OR session_id = current_setting('request.jwt.claim.session_id', true)
  );

-- Event owners can view all locks for their events
CREATE POLICY "Event owners can view event locks"
  ON public.slot_locks FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.time_slots ts
      JOIN public.events e ON e.id = ts.event_id
      WHERE ts.id = slot_locks.slot_id
        AND e.user_id = auth.uid()
    )
  );

-- =====================================================
-- BOOKING ATTEMPTS POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own booking attempts" ON public.booking_attempts;
DROP POLICY IF EXISTS "Anyone can insert booking attempts" ON public.booking_attempts;
DROP POLICY IF EXISTS "Event owners can view attempts" ON public.booking_attempts;

-- Users can view their own booking attempts
CREATE POLICY "Users can view own booking attempts"
  ON public.booking_attempts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- System can create booking attempts (via RPC)
CREATE POLICY "Anyone can insert booking attempts"
  ON public.booking_attempts FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Event owners can view all attempts for their events
CREATE POLICY "Event owners can view attempts"
  ON public.booking_attempts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = booking_attempts.event_id
        AND events.user_id = auth.uid()
    )
  );

-- =====================================================
-- UPDATE BOOKINGS TABLE POLICIES
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Guest users can view own booking by email" ON public.bookings;
DROP POLICY IF EXISTS "Guest users can cancel own booking" ON public.bookings;

-- Allow guest users (non-authenticated) to view their bookings by email
CREATE POLICY "Guest users can view own booking by email"
  ON public.bookings FOR SELECT
  TO anon
  USING (
    user_id IS NULL 
    AND email = current_setting('request.jwt.claim.email', true)
  );

-- Allow guest users to cancel their own bookings
CREATE POLICY "Guest users can cancel own booking"
  ON public.bookings FOR UPDATE
  TO anon
  USING (
    user_id IS NULL 
    AND email = current_setting('request.jwt.claim.email', true)
  )
  WITH CHECK (status = 'cancelled');

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant permissions on time_slots table
GRANT SELECT ON public.time_slots TO anon, authenticated;
GRANT ALL ON public.time_slots TO authenticated;

-- Grant permissions on slot_locks table
GRANT SELECT, INSERT, UPDATE ON public.slot_locks TO anon, authenticated;
GRANT ALL ON public.slot_locks TO authenticated;

-- Grant permissions on booking_attempts table
GRANT SELECT, INSERT ON public.booking_attempts TO anon, authenticated;
GRANT ALL ON public.booking_attempts TO authenticated;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is event owner
CREATE OR REPLACE FUNCTION public.is_slot_owner(slot_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.time_slots ts
    JOIN public.events e ON e.id = ts.event_id
    WHERE ts.id = slot_uuid
      AND e.user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if slot is publicly viewable
CREATE OR REPLACE FUNCTION public.is_slot_public(slot_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.time_slots ts
    JOIN public.events e ON e.id = ts.event_id
    WHERE ts.id = slot_uuid
      AND e.status = 'active'
      AND e.visibility IN ('public', 'unlisted')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_slot_owner(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_slot_public(UUID) TO anon, authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Anyone can view available time slots" ON public.time_slots IS 
'Allows anonymous and authenticated users to view available slots for public/unlisted active events.';

COMMENT ON POLICY "Event owners can manage time slots" ON public.time_slots IS 
'Event owners have full control over their event slots for management purposes.';

COMMENT ON POLICY "Anyone can create slot locks" ON public.time_slots IS 
'Required for anonymous booking flow. Capacity validation happens in create_slot_lock RPC.';

COMMENT ON POLICY "Guest users can view own booking by email" ON public.bookings IS 
'Allows non-authenticated users to view bookings they created using their email address.';