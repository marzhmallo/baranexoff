-- Create a SECURITY DEFINER function to lookup user email by username for authentication
-- This function bypasses RLS policies to enable username-based login
CREATE OR REPLACE FUNCTION public.auth_lookup_email_by_username(username_input text)
RETURNS TABLE(email text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.email,
    p.id as user_id
  FROM public.profiles p
  WHERE p.username = username_input
  LIMIT 1;
END;
$$;