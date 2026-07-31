-- ==============================================================================
-- 1. DECOUPLE VOTER IDENTITY FROM VOTES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.voted_students (
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    roll_number TEXT NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (election_id, roll_number)
);

-- Safely migrate existing tracking data to the new table
INSERT INTO public.voted_students (election_id, roll_number, voted_at)
SELECT election_id, roll_number, voted_at FROM public.votes
ON CONFLICT DO NOTHING;

-- Permanently drop the student's roll number from the votes table to guarantee anonymity!
ALTER TABLE public.votes DROP CONSTRAINT IF EXISTS unique_voter_election;
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'votes' AND column_name = 'roll_number') THEN
    ALTER TABLE public.votes DROP COLUMN roll_number;
  END IF;
END $$;

-- ==============================================================================
-- 2. APPLY RLS TO NEW TABLE & LOCK DOWN VOTES
-- ==============================================================================

ALTER TABLE public.voted_students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage their own voted students" ON public.voted_students;
CREATE POLICY "Admins manage their own voted students"
ON public.voted_students
FOR ALL TO authenticated
USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()))
WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));

-- COMPLETELY REVOKE DIRECT TABLE ACCESS FROM STUDENTS
-- We drop the policies created in the previous setup. The 'anon' role now has zero direct access to public.votes.
DROP POLICY IF EXISTS "Students can vote" ON public.votes;
DROP POLICY IF EXISTS "Students can check votes" ON public.votes;

-- ==============================================================================
-- 3. SECURE RPC FUNCTIONS (SECURITY DEFINER)
-- ==============================================================================

-- Safely check if a student has voted without granting SELECT permission
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

-- Safely submit an anonymous vote without granting INSERT permission
-- Plpgsql functions execute atomically within a single transaction by default.
-- If any statement fails (e.g., unique violation), the entire block is rolled back.
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
    -- Only allow voting on LIVE elections
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
        -- Throwing 23503 (foreign_key_violation) so the frontend gracefully catches it
        RAISE EXCEPTION 'The selected candidate is no longer available.' USING ERRCODE = '23503';
    END IF;

    -- 1. Track that the student has voted. 
    -- The PRIMARY KEY constraint will automatically throw a 23505 unique violation if they try twice.
    INSERT INTO public.voted_students (election_id, roll_number)
    VALUES (p_election_id, p_roll_number);

    -- 2. Insert the actual vote anonymously (no roll_number).
    INSERT INTO public.votes (election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION public.submit_vote TO anon;
GRANT EXECUTE ON FUNCTION public.submit_vote TO authenticated;
