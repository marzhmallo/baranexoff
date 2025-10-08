-- Enable real-time updates for officialranks table
ALTER TABLE public.officialranks REPLICA IDENTITY FULL;

-- Add the table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.officialranks;