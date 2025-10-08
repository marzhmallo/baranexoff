-- Drop existing RLS policy on activity_logs
DROP POLICY IF EXISTS "Owners and Admins can manage activity logs" ON public.activity_logs;

-- Create new RLS policy that uses user_roles table
CREATE POLICY "Users can view own logs, admins view barangay logs"
ON public.activity_logs
FOR SELECT
USING (
  -- Users can see their own logs
  (user_id = auth.uid())
  OR
  -- Admins/staff can see all logs in their barangay
  (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.role IN ('admin', 'staff')
    )
    AND brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
  )
);

-- Policy for INSERT (users can insert their own logs)
CREATE POLICY "Users can insert own activity logs"
ON public.activity_logs
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Policy for UPDATE (admins can update logs in their barangay)
CREATE POLICY "Admins can update activity logs in barangay"
ON public.activity_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'staff')
  )
  AND brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
);

-- Policy for DELETE (admins can delete logs in their barangay)
CREATE POLICY "Admins can delete activity logs in barangay"
ON public.activity_logs
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'staff')
  )
  AND brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
);