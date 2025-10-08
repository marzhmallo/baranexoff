-- Update get_current_user_admin_info to check user_roles table instead of profiles.role
CREATE OR REPLACE FUNCTION public.get_current_user_admin_info()
RETURNS TABLE(is_admin boolean, brgyid uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    has_role(auth.uid(), 'admin') as is_admin,
    brgyid
  FROM public.profiles 
  WHERE id = auth.uid();
$$;