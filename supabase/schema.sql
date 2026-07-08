-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Drop old tables if they exist to start clean
DROP TABLE IF EXISTS public.votes CASCADE;
DROP TABLE IF EXISTS public.waiting_room CASCADE;
DROP TABLE IF EXISTS public.candidates CASCADE;
DROP TABLE IF EXISTS public.elections CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create Elections Table (No references to profiles, with join code)
CREATE TABLE public.elections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    position TEXT NOT NULL,
    batch TEXT NOT NULL,
    join_code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('UPCOMING', 'WAITING_ROOM', 'LIVE', 'COMPLETED')) DEFAULT 'UPCOMING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create Candidates Table (Candidate details stored directly)
CREATE TABLE public.candidates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
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

-- Create Votes Table (Voter is identified by their roll number directly)
CREATE TABLE public.votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    election_id UUID REFERENCES public.elections(id) ON DELETE CASCADE NOT NULL,
    roll_number TEXT NOT NULL,
    candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
    voted_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_voter_election UNIQUE (election_id, roll_number)
);

-- Disable Row Level Security (RLS) for simple unauthenticated classroom elections
ALTER TABLE public.elections DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.waiting_room DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes DISABLE ROW LEVEL SECURITY;

-- Enable Realtime Replication for the necessary tables
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.elections, public.waiting_room, public.votes;
