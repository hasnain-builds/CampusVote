-- ==============================================================================
-- COMPLETE FIX FOR AUTHENTICATION & OWNERSHIP
-- ==============================================================================

DO $$ 
DECLARE
  v_default_admin UUID;
BEGIN

  -- 1. DROP THE BROKEN FOREIGN KEY
  ALTER TABLE public.elections DROP CONSTRAINT IF EXISTS elections_created_by_fkey;

  -- 2. CLEAN UP PROFILES
  -- Delete old hardcoded admins from public.profiles that have no matching auth.users record.
  DELETE FROM public.profiles p
  WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p.id);

  -- 3. REBUILD PROFILES
  -- Ensure every existing authenticated user has a corresponding profile.
  INSERT INTO public.profiles (id, name, email, role)
  SELECT 
    u.id, 
    COALESCE(u.raw_user_meta_data->>'name', 'Admin User'), 
    u.email, 
    'admin'
  FROM auth.users u
  WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

  -- 4. REASSIGN ORPHANED ELECTIONS
  -- Check if there are any orphaned elections to begin with
  IF EXISTS (
    SELECT 1 FROM public.elections e
    WHERE e.created_by IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = e.created_by)
  ) THEN
    -- Grab the first available valid authenticated admin.
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

  -- 5. RECREATE THE CORRECT FOREIGN KEY
  -- Now that data is clean, it is safe to strictly enforce ownership.
  ALTER TABLE public.elections 
  ADD CONSTRAINT elections_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE CASCADE;

  -- 6. ENFORCE NOT NULL
  ALTER TABLE public.elections
  ALTER COLUMN created_by SET NOT NULL;

END $$;

-- ==============================================================================
-- 7. VERIFY & SECURE THE SIGNUP TRIGGER
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
  -- Make it strictly idempotent so it doesn't fail if the profile already exists,
  -- and updates the existing profile's data automatically.
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, email = EXCLUDED.email;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 8. VERIFICATION QUERIES
-- Run these separately to confirm the final state.
-- ==============================================================================
/*
-- 1. Confirm profiles.id matches auth.users.id perfectly
SELECT 
  (SELECT COUNT(*) FROM public.profiles) AS profile_count,
  (SELECT COUNT(*) FROM auth.users) AS auth_count,
  (SELECT COUNT(*) FROM public.profiles p LEFT JOIN auth.users u ON p.id = u.id WHERE u.id IS NULL) AS orphan_profiles;

-- 2. Confirm the foreign key exists and points to auth.users
SELECT conname, pg_get_constraintdef(c.oid)
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'elections' AND conname = 'elections_created_by_fkey';

-- 3. Confirm all elections are owned by a valid user (Should return 0 rows)
SELECT e.id, e.title, e.created_by
FROM public.elections e
LEFT JOIN auth.users u ON e.created_by = u.id
WHERE u.id IS NULL; 
*/
