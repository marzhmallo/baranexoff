-- Add photo_url column to comments table for photo attachments
ALTER TABLE public.comments 
ADD COLUMN photo_url text;