-- Enable real-time updates for document-related tables
ALTER TABLE public.docrequests REPLICA IDENTITY FULL;
ALTER TABLE public.document_logs REPLICA IDENTITY FULL;
ALTER TABLE public.document_types REPLICA IDENTITY FULL;

-- Add the tables to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.docrequests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_types;