-- Fix the processedby column to allow NULL values
ALTER TABLE public.docrequests ALTER COLUMN processedby DROP NOT NULL;
ALTER TABLE public.docrequests ALTER COLUMN processedby DROP DEFAULT;

-- Update existing records to have NULL processedby for pending requests
UPDATE public.docrequests 
SET processedby = NULL 
WHERE status = 'pending';