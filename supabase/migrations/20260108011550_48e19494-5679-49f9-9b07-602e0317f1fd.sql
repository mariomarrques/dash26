-- Fix overly permissive INSERT policy on teams table
-- Drop the permissive policy and create a proper one

DROP POLICY IF EXISTS "Authenticated users can insert teams" ON public.teams;

-- Create new policy that requires user_id to match auth.uid()
CREATE POLICY "Users can insert own teams" 
ON public.teams 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);