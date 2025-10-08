-- Drop the problematic policy first
DROP POLICY IF EXISTS "Admins can update profiles in their barangay" ON public.profiles;

-- Create a security definer function to get current user's admin status and brgyid
CREATE OR REPLACE FUNCTION public.get_current_user_admin_info()
RETURNS TABLE(is_admin boolean, brgyid uuid) AS $$
  SELECT 
    (role = 'admin') as is_admin,
    brgyid
  FROM public.profiles 
  WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Create the correct policy using the function
CREATE POLICY "Admins can update profiles in their barangay" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.get_current_user_admin_info() admin_info
    WHERE admin_info.is_admin = true 
    AND admin_info.brgyid = profiles.brgyid
  )
);