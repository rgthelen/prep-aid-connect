-- Make the first user an admin
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'robert@rownd.io';

-- Create a secure function to check if user is admin (for RLS)
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = '';

-- Drop and recreate the user update policy with proper admin protection
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Regular users can update their profile but not admin status
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = user_id AND NOT public.is_current_user_admin())
  WITH CHECK (auth.uid() = user_id AND is_admin = false);

-- Admins can update any profile including admin status
CREATE POLICY "Admins can manage all users" ON public.profiles
  FOR UPDATE
  USING (public.is_current_user_admin());