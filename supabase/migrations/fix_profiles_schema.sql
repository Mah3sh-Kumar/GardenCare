-- Fix for profiles table issues
-- This script addresses potential issues with the profiles table that might cause 406 and 409 errors

-- First, ensure the profiles table has the correct structure
ALTER TABLE public.profiles 
ALTER COLUMN updated_at SET DEFAULT NOW();

-- Ensure the foreign key constraint is properly set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'profiles_id_fkey' 
    AND table_name = 'profiles'
  ) THEN
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey 
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Fix any profiles that might have null updated_at values
UPDATE public.profiles 
SET updated_at = NOW() 
WHERE updated_at IS NULL;

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies to ensure they're correct
DROP POLICY IF EXISTS "Profiles can be viewed by owner" ON public.profiles;
CREATE POLICY "Profiles can be viewed by owner" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be inserted by owner" ON public.profiles;
CREATE POLICY "Profiles can be inserted by owner" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be updated by owner" ON public.profiles;
CREATE POLICY "Profiles can be updated by owner" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles can be deleted by owner" ON public.profiles;
CREATE POLICY "Profiles can be deleted by owner" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Grant necessary permissions
GRANT ALL ON TABLE public.profiles TO authenticated;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';