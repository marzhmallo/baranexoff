-- Drop the broken policy that checks deprecated profiles.role column
DROP POLICY IF EXISTS "Admins view role audit logs in their barangay" ON public.role_audit_log;

-- Create correct policy using has_role function
CREATE POLICY "Admins view role audit logs in their barangay"
ON public.role_audit_log
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = role_audit_log.user_id
    AND p.brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
  )
);