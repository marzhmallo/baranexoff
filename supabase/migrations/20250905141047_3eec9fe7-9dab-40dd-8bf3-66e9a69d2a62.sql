-- Check and fix RLS policies for announcements table
-- First, let's see the current policies
SELECT 
    pol.policyname,
    pol.permissive,
    pol.roles,
    pol.cmd,
    pol.qual,
    pol.with_check
FROM pg_policy pol 
JOIN pg_class pc ON pol.polrelid = pc.oid 
WHERE pc.relname = 'announcements';

-- The issue is that the PUBLIC VIEW policy might not be working correctly
-- Let's drop and recreate the public view policy to ensure it works properly
DROP POLICY IF EXISTS "PUBLIC VIEW" ON public.announcements;

-- Create a proper public view policy that allows unauthenticated access
CREATE POLICY "Public can view all announcements"
ON public.announcements
FOR SELECT
TO public, anon, authenticated
USING (true);

-- Also ensure the policy for authenticated users in their barangay works correctly  
DROP POLICY IF EXISTS "Barangay Admins View Local Announcements" ON public.announcements;

CREATE POLICY "Users can view announcements in their barangay"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  brgyid = (
    SELECT profiles.brgyid 
    FROM profiles 
    WHERE profiles.id = auth.uid()
  )
);