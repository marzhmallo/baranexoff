-- Ensure service role detection exists
CREATE OR REPLACE FUNCTION public.is_service_role()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  RETURN (SELECT auth.role()) = 'service_role';
END;
$$;

-- Allow admins or service role to modify profile roles; block everyone else
CREATE OR REPLACE FUNCTION public.handle_profile_role_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Allow if caller is an admin or the service role (edge function using service key)
  IF public.is_admin() OR public.is_service_role() THEN
    RETURN NEW;
  END IF;

  -- Block non-admin/non-service attempts to change role
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    RAISE EXCEPTION 'Role modification is not allowed.';
  END IF;

  RETURN NEW;
END;
$$;