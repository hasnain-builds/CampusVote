-- ==============================================================================
-- FINAL PRODUCTION MIGRATION
-- This script fully resolves Authentication, Ownership, RLS, and Voter Privacy.
-- It is designed to be perfectly idempotent and run safely multiple times.
-- ==============================================================================

DO $$ 
DECLARE
  v_default_admin UUID;
BEGIN
  -- ==============================================================================
  -- 1. AUTHENTICATION & PROFILES REBUILD
  -- ==============================================================================
  
  -- Create profiles table if not exists (baseline)
  CREATE TABLE IF NOT EXISTS public.profiles (
      id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
  );

  -- Delete old hardcoded admins from public.profiles that have no matching auth.users record
  DELETE FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

  -- Rebuild profiles to ensure every existing authenticated user has a matching profile
  INSERT INTO public.profiles (id, name, email, role)
  SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'name', 'Admin User'), 
    u.email, 
    'admin'
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);


  -- ==============================================================================
  -- 2. OWNERSHIP (Elections created_by)
  -- ==============================================================================

  -- Drop the broken foreign key if it exists
  ALTER TABLE public.elections DROP CONSTRAINT IF EXISTS elections_created_by_fkey;

  -- Check if there are any orphaned elections to begin with
  IF EXISTS (
    SELECT 1 FROM public.elections e
    WHERE e.created_by IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.created_by)
  ) THEN
    -- Grab the first available valid authenticated admin
    SELECT id INTO v_default_admin FROM auth.users LIMIT 1;

    IF v_default_admin IS NOT NULL THEN
      -- Reassign elections with missing or invalid owners to a valid admin
      UPDATE public.elections e
      SET created_by = v_default_admin
      WHERE e.created_by IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.created_by);
    ELSE
      RAISE EXCEPTION 'No authenticated users found. Cannot reassign orphaned elections. Migration aborted.';
    END IF;
  END IF;

  -- Recreate the correct foreign key enforcing ownership via auth.users
  ALTER TABLE public.elections 
  ADD CONSTRAINT elections_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- Enforce NOT NULL for all future elections
  ALTER TABLE public.elections
  ALTER COLUMN created_by SET NOT NULL;


  -- ==============================================================================
  -- 3. VOTER PRIVACY (Decouple Voter Identity from Votes)
  -- ==============================================================================

  -- Create the tracking table isolated from the actual votes
  CREATE TABLE IF NOT EXISTS public.voted_students (
      election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
      roll_number TEXT NOT NULL,
      voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
      PRIMARY KEY (election_id, roll_number)
  );

  -- Safely migrate existing data if 'roll_number' still exists on votes table
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'votes' AND column_name = 'roll_number') THEN
      -- Execute dynamic SQL because the column might not exist on subsequent runs
      EXECUTE 'INSERT INTO public.voted_students (election_id, roll_number, voted_at)
               SELECT election_id, roll_number, voted_at FROM public.votes
               ON CONFLICT DO NOTHING';
               
      -- Permanently drop the student''s roll number from the votes table to guarantee anonymity
      ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS unique_voter_election;
      ALTER TABLE public.votes DROP COLUMN roll_number;
  END IF;

END $$;


-- ==============================================================================
-- 4. SIGNUP TRIGGER (handle_new_user)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', 'Admin User'),
    new.email,
    'admin'
  )
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ==============================================================================
-- 5. SECURE RPC FUNCTIONS (Voting Engine)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.has_already_voted(
    p_election_id UUID,
    p_roll_number TEXT
) RETURNS boolean 
SET search_path = public
AS $$
DECLARE
    v_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.voted_students 
        WHERE election_id = p_election_id AND roll_number = p_roll_number
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.has_already_voted TO anon;
GRANT EXECUTE ON FUNCTION public.has_already_voted TO authenticated;


CREATE OR REPLACE FUNCTION public.submit_vote(
    p_election_id UUID,
    p_roll_number TEXT,
    p_candidate_id UUID
) RETURNS void 
SET search_path = public
AS $$
DECLARE
    v_election_status TEXT;
    v_candidate_exists BOOLEAN;
BEGIN
    -- Verify election is active
    SELECT status INTO v_election_status FROM public.elections WHERE id = p_election_id;
    IF v_election_status != 'LIVE' THEN
        RAISE EXCEPTION 'Voting is not active for this election.';
    END IF;

    -- Verify that the candidate actually belongs to this election
    SELECT EXISTS (
        SELECT 1 FROM public.candidates 
        WHERE id = p_candidate_id AND election_id = p_election_id
    ) INTO v_candidate_exists;
    
    IF NOT v_candidate_exists THEN
        RAISE EXCEPTION 'The selected candidate is no longer available.' USING ERRCODE = '23503';
    END IF;

    -- 1. Track that the student has voted. 
    INSERT INTO public.voted_students (election_id, roll_number)
    VALUES (p_election_id, p_roll_number);

    -- 2. Insert the actual vote anonymously (no roll_number).
    INSERT INTO public.votes (election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.submit_vote TO anon;
GRANT EXECUTE ON FUNCTION public.submit_vote TO authenticated;


-- ==============================================================================
-- 6. ADMIN ISOLATION & RLS POLICIES
-- ==============================================================================

-- Enable RLS across the board
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voted_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- 6.1. Elections
DROP POLICY IF EXISTS "Admins manage their own elections" ON public.elections;
DROP POLICY IF EXISTS "Students can view elections" ON public.elections;
DROP POLICY IF EXISTS "Anyone can view elections" ON public.elections;
CREATE POLICY "Admins manage their own elections" ON public.elections FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Students can view elections" ON public.elections FOR SELECT TO anon USING (true);

-- 6.2. Candidates
DROP POLICY IF EXISTS "Admins manage their own candidates" ON public.candidates;
DROP POLICY IF EXISTS "Students can view candidates" ON public.candidates;
DROP POLICY IF EXISTS "Anyone can view candidates" ON public.candidates;
CREATE POLICY "Admins manage their own candidates" ON public.candidates FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
CREATE POLICY "Students can view candidates" ON public.candidates FOR SELECT TO anon USING (true);

-- 6.3. Waiting Room
DROP POLICY IF EXISTS "Admins manage their own waiting room" ON public.waiting_room;
DROP POLICY IF EXISTS "Students can join waiting room" ON public.waiting_room;
DROP POLICY IF EXISTS "Students can check waiting room" ON public.waiting_room;
CREATE POLICY "Admins manage their own waiting room" ON public.waiting_room FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
CREATE POLICY "Students can join waiting room" ON public.waiting_room FOR INSERT TO anon WITH CHECK (true);
-- Notice: No SELECT access for anon on waiting room, as requested previously to avoid enumeration.

-- 6.4. Voted Students
DROP POLICY IF EXISTS "Admins manage their own voted students" ON public.voted_students;
CREATE POLICY "Admins manage their own voted students" ON public.voted_students FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
-- Note: 'anon' is explicitly denied all access to voted_students. (Voting logic is handled by RPC)

-- 6.5. Votes
DROP POLICY IF EXISTS "Admins manage their own votes" ON public.votes;
DROP POLICY IF EXISTS "Students can vote" ON public.votes;
DROP POLICY IF EXISTS "Students can check votes" ON public.votes;
CREATE POLICY "Admins manage their own votes" ON public.votes FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
-- Note: 'anon' is explicitly denied all access to votes. (Voting logic is handled by RPC)
