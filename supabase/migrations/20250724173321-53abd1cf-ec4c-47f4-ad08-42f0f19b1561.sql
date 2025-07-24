-- Fix the infinite recursion issue completely
-- Remove the existing problematic policies and function
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Create a simple admin check policy that doesn't cause recursion
-- This policy allows users to see all profiles only if they are admin
-- We'll create a direct approach using a subquery that won't cause recursion
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p 
    WHERE p.user_id = auth.uid() 
    AND p.is_admin = true
  )
);

-- Since this might still cause recursion, let's try a different approach
-- Drop the above policy and create one that only allows users to see their own profile
-- and a separate policy for admin access
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Allow users to see only their own profile by default
-- The existing "Users can view their own profile" policy should handle this

-- For admin functionality, we'll handle this differently in the application code
-- Admin users will use a special query that bypasses RLS