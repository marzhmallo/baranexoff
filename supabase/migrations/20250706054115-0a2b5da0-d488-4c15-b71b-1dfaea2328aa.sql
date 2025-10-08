-- Fix the processedby column to allow NULL values
ALTER TABLE public.docrequests ALTER COLUMN processedby DROP NOT NULL;
ALTER TABLE public.docrequests ALTER COLUMN processedby DROP DEFAULT;

-- Update existing records to have NULL processedby for pending requests
UPDATE public.docrequests 
SET processedby = NULL 
WHERE status = 'pending';

-- Add the missing foreign key relationship between docrequests and profiles
ALTER TABLE public.docrequests 
ADD CONSTRAINT docrequests_resident_id_fkey 
FOREIGN KEY (resident_id) REFERENCES public.profiles(id);