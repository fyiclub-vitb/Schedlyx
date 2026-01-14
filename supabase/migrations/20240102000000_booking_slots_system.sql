-- Booking Slots System Migration
-- Adds slot-based booking capabilities similar to BookMyShow
-- FIXED: Resolved "slot_id is ambiguous" by using table aliases and variable conflict settings

-- =====================================================
-- TIME SLOTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  
  -- Time Information
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  
  -- Capacity Management
  total_capacity INTEGER NOT NULL CHECK (total_capacity > 0),
  booked_count INTEGER DEFAULT 0 CHECK (booked_count >= 0),
  available_count INTEGER GENERATED ALWAYS AS (total_capacity - booked_count) STORED,
  
  -- Slot Status
  status TEXT NOT NULL DEFAULT 'available',
  is_locked BOOLEAN DEFAULT false,
  locked_until TIMESTAMPTZ,
  
  -- Pricing
  price DECIMAL(10, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT time_slots_time_check CHECK (end_time > start_time),
  CONSTRAINT time_slots_status_check CHECK (status IN ('available', 'full', 'cancelled')),
  CONSTRAINT time_slots_capacity_check CHECK (booked_count <= total_capacity)
);

-- =====================================================
-- SLOT LOCKS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.slot_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.time_slots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  
  -- Lock Details
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  released_at TIMESTAMPTZ,
  
  CONSTRAINT slot_locks_expires_check CHECK (expires_at > locked_at)
);

-- =====================================================
-- BOOKING ATTEMPTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.booking_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  email TEXT,
  status TEXT NOT NULL,
  failure_reason TEXT,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT booking_attempts_status_check CHECK (status IN ('success', 'failed', 'abandoned'))
);

-- =====================================================
-- UPDATE BOOKINGS TABLE
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='slot_id') THEN
    ALTER TABLE public.bookings ADD COLUMN slot_id UUID REFERENCES public.time_slots(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='booking_reference') THEN
    ALTER TABLE public.bookings ADD COLUMN booking_reference TEXT UNIQUE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='expires_at') THEN
    ALTER TABLE public.bookings ADD COLUMN expires_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='bookings' AND column_name='confirmed_at') THEN
    ALTER TABLE public.bookings ADD COLUMN confirmed_at TIMESTAMPTZ;
  END IF;
END $$;

-- =====================================================
-- SLOT AVAILABILITY FUNCTIONS
-- =====================================================

-- Get available slots for an event
-- FIXED: Added #variable_conflict use_column and explicit table aliases to stop ambiguity
CREATE OR REPLACE FUNCTION get_available_slots(p_event_id UUID)
RETURNS TABLE (
  slot_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  total_capacity INTEGER,
  available_count INTEGER,
  price DECIMAL(10, 2)
) AS $$
#variable_conflict use_column
BEGIN
  -- Clean up expired locks first
  PERFORM public.release_expired_locks();
  
  RETURN QUERY
  SELECT 
    ts.id AS slot_id,
    ts.start_time,
    ts.end_time,
    ts.total_capacity,
    (ts.available_count - COALESCE(
      (SELECT SUM(sl.quantity) 
       FROM public.slot_locks sl
       WHERE sl.slot_id = ts.id 
         AND sl.is_active = true 
         AND sl.expires_at > NOW()), 
      0
    ))::INTEGER AS available_count,
    ts.price
  FROM public.time_slots ts
  WHERE ts.event_id = p_event_id
    AND ts.status = 'available'
    AND ts.start_time > NOW()
    AND ts.available_count > 0
  ORDER BY ts.start_time;
END;
$$ LANGUAGE plpgsql;

-- Create slot lock
CREATE OR REPLACE FUNCTION create_slot_lock(
  p_slot_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_lock_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
#variable_conflict use_column
DECLARE
  v_lock_id UUID;
  v_available INTEGER;
BEGIN
  -- Check availability including current active locks
  SELECT (ts.available_count - COALESCE(
    (SELECT SUM(sl.quantity) 
     FROM public.slot_locks sl
     WHERE sl.slot_id = p_slot_id 
       AND sl.is_active = true 
       AND sl.expires_at > NOW()), 
    0
  )) INTO v_available
  FROM public.time_slots ts
  WHERE ts.id = p_slot_id;
  
  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient slots available';
  END IF;
  
  -- Create lock
  INSERT INTO public.slot_locks (
    slot_id, user_id, session_id, quantity, 
    expires_at
  ) VALUES (
    p_slot_id, p_user_id, p_session_id, p_quantity,
    NOW() + (p_lock_duration_minutes || ' minutes')::INTERVAL
  ) RETURNING id INTO v_lock_id;
  
  RETURN v_lock_id;
END;
$$ LANGUAGE plpgsql;

-- Release slot lock
CREATE OR REPLACE FUNCTION release_slot_lock(p_lock_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE public.slot_locks
  SET is_active = false, released_at = NOW()
  WHERE id = p_lock_id AND is_active = true;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Release expired locks
CREATE OR REPLACE FUNCTION release_expired_locks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.slot_locks
  SET is_active = false, released_at = NOW()
  WHERE is_active = true 
    AND expires_at <= NOW();
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Complete booking
CREATE OR REPLACE FUNCTION complete_slot_booking(
  p_lock_id UUID,
  p_first_name TEXT,
  p_last_name TEXT,
  p_email TEXT,
  p_phone TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_booking_id UUID;
  v_lock RECORD;
  v_slot RECORD;
  v_reference TEXT;
BEGIN
  SELECT * INTO v_lock FROM public.slot_locks WHERE id = p_lock_id AND is_active = true AND expires_at > NOW();
  IF NOT FOUND THEN RAISE EXCEPTION 'Lock not found or expired'; END IF;
  
  SELECT * INTO v_slot FROM public.time_slots WHERE id = v_lock.slot_id;
  
  LOOP
    v_reference := upper(substr(md5(random()::text), 1, 8));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.bookings WHERE booking_reference = v_reference);
  END LOOP;
  
  INSERT INTO public.bookings (
    event_id, slot_id, user_id, first_name, last_name, email, phone,
    date, time, timezone, status, notes, booking_reference, confirmed_at
  ) VALUES (
    v_slot.event_id, v_lock.slot_id, v_lock.user_id, p_first_name, p_last_name, p_email, p_phone,
    v_slot.start_time::DATE, v_slot.start_time::TIME, 'UTC', 'confirmed', p_notes, v_reference, NOW()
  ) RETURNING id INTO v_booking_id;
  
  UPDATE public.time_slots SET booked_count = booked_count + v_lock.quantity WHERE id = v_lock.slot_id;
  UPDATE public.time_slots SET status = 'full' WHERE id = v_lock.slot_id AND available_count = 0;
  
  PERFORM public.release_slot_lock(p_lock_id);
  RETURN v_booking_id;
END;
$$ LANGUAGE plpgsql;

-- Generate time slots
CREATE OR REPLACE FUNCTION generate_event_slots(
  p_event_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_capacity_per_slot INTEGER DEFAULT 10
)
RETURNS INTEGER AS $$
DECLARE
  v_event RECORD;
  v_curr DATE;
  v_start TIME;
  v_end TIME;
  v_count INTEGER := 0;
BEGIN
  SELECT * INTO v_event FROM public.events WHERE id = p_event_id;
  v_curr := p_start_date;
  WHILE v_curr <= p_end_date LOOP
    IF TRIM(TO_CHAR(v_curr, 'Day')) = ANY(v_event.available_days) THEN
      v_start := (v_event.time_slots->>'start')::TIME;
      v_end := v_start + (v_event.duration || ' minutes')::INTERVAL;
      WHILE v_end <= (v_event.time_slots->>'end')::TIME LOOP
        INSERT INTO public.time_slots (event_id, start_time, end_time, total_capacity)
        VALUES (p_event_id, v_curr + v_start, v_curr + v_end, p_capacity_per_slot);
        v_count := v_count + 1;
        v_start := v_end + (v_event.buffer_time || ' minutes')::INTERVAL;
        v_end := v_start + (v_event.duration || ' minutes')::INTERVAL;
      END LOOP;
    END IF;
    v_curr := v_curr + 1;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Permissions
GRANT EXECUTE ON FUNCTION get_available_slots(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_slot_lock(UUID, UUID, TEXT, INTEGER, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION release_slot_lock(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION complete_slot_booking(UUID, TEXT, TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION generate_event_slots(UUID, DATE, DATE, INTEGER) TO authenticated;