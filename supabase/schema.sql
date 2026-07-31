-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old tables if they exist to start clean
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.voted_students CASCADE;
DROP TABLE IF EXISTS public.waiting_room CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.elections CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create Profiles Table for Admin Users
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Elections Table (with join code)
CREATE TABLE public.elections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    batch TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'WAITING_ROOM', 'LIVE', 'COMPLETED')) DEFAULT 'UPCOMING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid() NOT NULL
);

-- Create Candidates Table (Candidate details stored directly)
CREATE TABLE public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Waiting Room Table (Tracks students waiting for the election to start)
CREATE TABLE public.waiting_room (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    roll_number TEXT NOT NULL,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_waiting_voter UNIQUE (election_id, roll_number)
);

-- Create Voted Students Table (Tracks WHO voted, completely isolated from WHO they voted for)
CREATE TABLE public.voted_students (
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    roll_number TEXT NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (election_id, roll_number)
);

-- Create Votes Table (Tracks ACTUAL votes anonymously. Notice there is NO roll_number column)
CREATE TABLE public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voted_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Admins get full access to their own elections
CREATE POLICY "Admins manage their own elections" ON public.elections FOR ALL TO authenticated USING (created_by = auth.uid()) WITH CHECK (created_by = auth.uid());
CREATE POLICY "Students can view elections" ON public.elections FOR SELECT TO anon USING (true);

-- Admins get full access to candidates of their own elections
CREATE POLICY "Admins manage their own candidates" ON public.candidates FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
CREATE POLICY "Students can view candidates" ON public.candidates FOR SELECT TO anon USING (true);

-- Admins get full access to their own waiting rooms
CREATE POLICY "Admins manage their own waiting room" ON public.waiting_room FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
CREATE POLICY "Students can join waiting room" ON public.waiting_room FOR INSERT TO anon WITH CHECK (true);

-- Admins get full access to voted_students
CREATE POLICY "Admins manage their own voted students" ON public.voted_students FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
-- Note: 'anon' is explicitly denied access to voted_students!

-- Admins get full access to votes in their own elections
CREATE POLICY "Admins manage their own votes" ON public.votes FOR ALL TO authenticated USING (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid())) WITH CHECK (election_id IN (SELECT id FROM public.elections WHERE created_by = auth.uid()));
-- Note: 'anon' is explicitly denied access to votes!

-- ==========================================
-- Secure RPC Functions
-- ==========================================

-- Check if voted
CREATE OR REPLACE FUNCTION public.has_already_voted(
    p_election_id UUID,
    p_roll_number TEXT
) RETURNS boolean AS $$
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

-- Submit anonymous vote
CREATE OR REPLACE FUNCTION public.submit_vote(
    p_election_id UUID,
    p_roll_number TEXT,
    p_candidate_id UUID
) RETURNS void AS $$
DECLARE
    v_election_status TEXT;
BEGIN
    SELECT status INTO v_election_status FROM public.elections WHERE id = p_election_id;
    IF v_election_status != 'LIVE' THEN
        RAISE EXCEPTION 'Voting is not active for this election.';
    END IF;

    INSERT INTO public.voted_students (election_id, roll_number)
    VALUES (p_election_id, p_roll_number);

    INSERT INTO public.votes (election_id, candidate_id)
    VALUES (p_election_id, p_candidate_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Realtime Replication for the necessary tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.elections, public.waiting_room, public.votes;
