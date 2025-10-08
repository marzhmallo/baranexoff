
-- Add unique constraint to settings table to prevent duplicate userid+key combinations
ALTER TABLE public.settings ADD CONSTRAINT settings_userid_key_unique UNIQUE (userid, key);
