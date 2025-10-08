-- Allow users to view their assigned barangay
CREATE POLICY "Users can view their assigned barangay" 
ON public.barangays 
FOR SELECT 
USING (
  id = (
    SELECT profiles.brgyid 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);