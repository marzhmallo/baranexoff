-- Create trigger function to audit role changes
CREATE OR REPLACE FUNCTION public.audit_role_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.role_audit_log (user_id, role, action, changed_by)
    VALUES (NEW.user_id, NEW.role, 'added', auth.uid());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.role_audit_log (user_id, role, action, changed_by)
    VALUES (OLD.user_id, OLD.role, 'removed', auth.uid());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger on user_roles table
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
CREATE TRIGGER audit_user_roles_changes
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_changes();