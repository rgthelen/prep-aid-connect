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

-- Update the profiles policy to prevent non-admins from changing admin status
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND 
    (
      -- If trying to change is_admin field, must be current admin
      (OLD.is_admin = NEW.is_admin) OR 
      public.is_current_user_admin()
    )
  );

-- Add policy for admins to manage other users
CREATE POLICY "Admins can manage all users" ON public.profiles
  FOR UPDATE
  USING (public.is_current_user_admin())
  WITH CHECK (public.is_current_user_admin());