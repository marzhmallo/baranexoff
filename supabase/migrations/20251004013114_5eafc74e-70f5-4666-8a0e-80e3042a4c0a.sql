-- Add INSERT policy for admins to write audit logs
CREATE POLICY "Admins insert role audit logs"
ON public.role_audit_log
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop the broken trigger and function (using manual inserts instead)
DROP TRIGGER IF EXISTS audit_user_roles_changes ON public.user_roles;
DROP FUNCTION IF EXISTS public.audit_role_changes();