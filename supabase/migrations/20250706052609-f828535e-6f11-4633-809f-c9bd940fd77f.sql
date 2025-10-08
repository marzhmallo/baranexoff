-- Drop the existing foreign key constraint
ALTER TABLE public.docrequests DROP CONSTRAINT IF EXISTS certificates_resident_id_fkey;

-- Make resident_id nullable to allow requests from users who aren't in residents table
ALTER TABLE public.docrequests ALTER COLUMN resident_id DROP NOT NULL;

-- Add a new foreign key constraint that references profiles table instead
ALTER TABLE public.docrequests 
ADD CONSTRAINT docrequests_resident_id_fkey 
FOREIGN KEY (resident_id) 
REFERENCES public.profiles(id) 
ON DELETE CASCADE;