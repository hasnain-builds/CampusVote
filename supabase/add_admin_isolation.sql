-- ==============================================================================
-- 1. ADD OWNERSHIP COLUMN & DATA MIGRATION (IDEMPOTENT)
-- ==============================================================================

DO $$ 
BEGIN
  -- Add created_by column if it does not exist (nullable initially to allow for backfilling)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'elections' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.elections ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- Safely assign orphaned elections to the first available admin profile
-- This guarantees existing data is not deleted and prevents orphaned records.
DO $$ 
DECLARE
  first_admin_id UUID;
BEGIN
  -- Get the first admin's ID
  SELECT id INTO first_admin_id FROM public.profiles LIMIT 1;
  
  -- If we found an admin, assign all orphaned elections to them
  IF first_admin_id IS NOT NULL THEN
    UPDATE public.elections SET created_by = first_admin_id WHERE created_by IS NULL;
  END IF;
END $$;

-- Now enforce NOT NULL and set the default to the authenticated user's ID.
-- We only apply NOT NULL if there are no NULLs left, ensuring the migration never crashes.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.elections WHERE created_by IS NULL) THEN
    ALTER TABLE public.elections ALTER COLUMN created_by SET NOT NULL;
  END IF;
END $$;

ALTER TABLE public.elections ALTER COLUMN created_by SET DEFAULT auth.uid();

-- ==============================================================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ==============================================================================

ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. IDEMPOTENT POLICY CLEANUP
-- ==============================================================================

DROP POLICY IF EXISTS "Admins manage their own elections" ON public.elections;
DROP POLICY IF EXISTS "Anyone can view elections" ON public.elections;
DROP POLICY IF EXISTS "Students can view elections" ON public.elections;

DROP POLICY IF EXISTS "Admins manage their own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Students can view candidates" ON public.candidates;

DROP POLICY IF EXISTS "Admins manage their own waiting room" ON public.waiting_room;
DROP POLICY IF EXISTS "Students can join waiting room" ON public.waiting_room;
DROP POLICY IF EXISTS "Students can check waiting room" ON public.waiting_room;

DROP POLICY IF EXISTS "Admins manage their own votes" ON public.votes;
DROP POLICY IF EXISTS "Students can vote" ON public.votes;
DROP POLICY IF EXISTS "Students can check votes" ON public.votes;

-- ==============================================================================
-- 4. RLS POLICIES FOR ELECTIONS
-- ==============================================================================

-- Admins get full access to their own elections
CREATE POLICY "Admins manage their own elections"
ON public.elections
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

-- Students (anon) need to SELECT elections to validate a join code.
CREATE POLICY "Students can view elections"
ON public.elections
FOR SELECT TO anon
USING (true);

-- ==============================================================================
-- 5. RLS POLICIES FOR CANDIDATES
-- ==============================================================================

-- Admins get full access to candidates of their own elections
CREATE POLICY "Admins manage their own candidates"
ON public.candidates
FOR ALL TO authenticated
USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()))
WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));

-- Students need to SELECT candidates for the election they joined.
CREATE POLICY "Students can view candidates"
ON public.candidates
FOR SELECT TO anon
USING (true);

-- ==============================================================================
-- 6. RLS POLICIES FOR WAITING ROOM
-- ==============================================================================

-- Admins get full access to their own waiting rooms
CREATE POLICY "Admins manage their own waiting room"
ON public.waiting_room
FOR ALL TO authenticated
USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()))
WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));

-- Students can join the waiting room
CREATE POLICY "Students can join waiting room"
ON public.waiting_room
FOR INSERT TO anon
WITH CHECK (true);

-- NO SELECT POLICY FOR ANON ON WAITING ROOM!
-- The frontend student flow only INSERTs into the waiting room. 
-- By omitting a SELECT policy for anon, we completely block anonymous users 
-- from reading the waiting_room table.

-- ==============================================================================
-- 7. RLS POLICIES FOR VOTES
-- ==============================================================================

-- Admins get full access to votes in their own elections
CREATE POLICY "Admins manage their own votes"
ON public.votes
FOR ALL TO authenticated
USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()))
WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));

-- Students can cast a vote
CREATE POLICY "Students can vote"
ON public.votes
FOR INSERT TO anon
WITH CHECK (true);

-- Students must SELECT from votes to check if they have already voted (hasAlreadyVoted).
CREATE POLICY "Students can check votes"
ON public.votes
FOR SELECT TO anon
USING (true);
