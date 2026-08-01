-- ==============================================================================
-- REMOVE PARTICIPANT & WAITING ROOM STATUS RPC MIGRATION
-- ==============================================================================

-- Ensure full replica identity for waiting_room so DELETE events broadcast the full payload (roll_number)
ALTER TABLE public.waiting_room REPLICA IDENTITY FULL;

-- Helper RPC function for checking if a student roll number is currently in the waiting room
CREATE OR REPLACE FUNCTION public.is_in_waiting_room(
    p_election_id UUID,
    p_roll_number TEXT
) RETURNS boolean 
SET search_path = public
AS $$
DECLARE
    v_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.waiting_room 
        WHERE election_id = p_election_id AND roll_number = p_roll_number
    ) INTO v_exists;
    RETURN v_exists;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.is_in_waiting_room TO anon;
GRANT EXECUTE ON FUNCTION public.is_in_waiting_room TO authenticated;
