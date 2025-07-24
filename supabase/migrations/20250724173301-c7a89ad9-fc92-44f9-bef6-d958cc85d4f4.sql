-- Fix infinite recursion in profiles RLS policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a safer admin view policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (is_current_user_admin());

-- Ensure the security definer function exists and works correctly
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$;