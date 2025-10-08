-- Allow admins to update user profiles in their barangay
CREATE POLICY "Admins can update profiles in their barangay" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM profiles admin_profile 
    WHERE admin_profile.id = auth.uid() 
    AND admin_profile.role = 'admin' 
    AND admin_profile.brgyid = profiles.brgyid
  )
);