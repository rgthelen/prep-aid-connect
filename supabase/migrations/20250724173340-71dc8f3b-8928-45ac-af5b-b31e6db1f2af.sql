-- Fix the infinite recursion by updating all dependent policies
-- First, drop all policies that depend on the function
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all users" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Now we can drop the function
DROP FUNCTION IF EXISTS public.is_current_user_admin();

-- Recreate the user profile update policy without the problematic function
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND is_admin = false);

-- For admin management, we'll use a service role approach in the application
-- Create a simple policy that allows admin updates through service role
CREATE POLICY "Service role can manage all profiles"
ON public.profiles
FOR ALL
USING (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role');

-- Create the admin update policy that doesn't cause recursion
-- We'll check admin status differently
CREATE POLICY "Admins can manage all users"
ON public.profiles
FOR UPDATE
USING (
  -- Allow if the current user is updating any profile and they are admin
  -- We use a simple approach that won't cause recursion
  auth.uid() IN (
    SELECT user_id FROM public.profiles 
    WHERE is_admin = true 
    AND user_id = auth.uid()
  )
);