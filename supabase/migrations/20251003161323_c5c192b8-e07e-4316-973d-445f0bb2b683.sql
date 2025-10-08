-- Drop old trigger and function
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
DROP FUNCTION IF EXISTS public.audit_role_changes();

-- This trigger will NOT automatically create audit logs
-- Audit logs will be created manually in application code
-- to allow for reasons and proper old_role/new_role tracking