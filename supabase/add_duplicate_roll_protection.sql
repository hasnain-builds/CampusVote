-- ==============================================================================
-- SQL MIGRATION: CLEANUP DUPLICATE WAITING ROOM ROWS & ADD UNIQUE CONSTRAINT
-- ==============================================================================

DO $$ 
DECLARE
  v_dup_count INT;
BEGIN
  -- 1. Detect duplicate (election_id, roll_number) rows
  SELECT COUNT(*) INTO v_dup_count
  FROM (
    SELECT election_id, roll_number
    FROM public.waiting_room
    GROUP BY election_id, roll_number
    HAVING COUNT(*) > 1
  ) dups;

  IF v_dup_count > 0 THEN
    RAISE NOTICE 'Found % duplicate group(s) in waiting_room. Deduplicating while retaining earliest joined records...', v_dup_count;
  END IF;

  -- 2. Remove duplicate rows keeping only the earliest joined record (MIN joined_at, MIN id)
  DELETE FROM public.waiting_room w1
  USING public.waiting_room w2
  WHERE w1.election_id = w2.election_id
    AND w1.roll_number = w2.roll_number
    AND (
      w1.joined_at > w2.joined_at 
      OR (w1.joined_at = w2.joined_at AND w1.id > w2.id)
    );

  -- 3. Idempotently add UNIQUE constraint unique_waiting_voter
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_waiting_voter'
  ) THEN
    ALTER TABLE public.waiting_room 
    ADD CONSTRAINT unique_waiting_voter UNIQUE (election_id, roll_number);
    RAISE NOTICE 'Constraint unique_waiting_voter successfully added.';
  ELSE
    RAISE NOTICE 'Constraint unique_waiting_voter already exists.';
  END IF;
END $$;

-- 4. Verification: Confirm constraint exists
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname = 'unique_waiting_voter';
