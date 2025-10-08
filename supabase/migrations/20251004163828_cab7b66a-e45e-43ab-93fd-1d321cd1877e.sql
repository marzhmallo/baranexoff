-- Add specific place column to emergency_requests table
ALTER TABLE public.emergency_requests
ADD COLUMN IF NOT EXISTS specificplace text;