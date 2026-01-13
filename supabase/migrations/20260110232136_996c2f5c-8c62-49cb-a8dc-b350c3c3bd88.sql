-- Fix teams table SELECT policy to prevent business intelligence exposure
-- Drop the overly permissive policy that allows all authenticated users to see all teams
DROP POLICY IF EXISTS "Authenticated users can view all teams" ON public.teams;

-- Create a new policy that only allows viewing:
-- 1. Pre-seeded reference teams (user_id IS NULL) - global data
-- 2. User's own custom teams (auth.uid() = user_id) - private data
CREATE POLICY "Users can view global and own teams"
ON public.teams
FOR SELECT
TO authenticated
USING (user_id IS NULL OR auth.uid() = user_id);