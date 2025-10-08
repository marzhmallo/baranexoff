-- Add SELECT policy for admins to view all role audit logs in their barangay
CREATE POLICY "Admins view role audit logs in their barangay"
ON public.role_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid() 
    AND p.role = 'admin'
    AND p.brgyid IN (
      SELECT brgyid 
      FROM public.profiles 
      WHERE id = role_audit_log.user_id
    )
  )
);

-- Add SELECT policy for users to view their own role audit logs
CREATE POLICY "Users view own role audit logs"
ON public.role_audit_log
FOR SELECT
USING (user_id = auth.uid());