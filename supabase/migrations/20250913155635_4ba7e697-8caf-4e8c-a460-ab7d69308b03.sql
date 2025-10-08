-- Create a trigger function that calls the login-alert edge function
CREATE OR REPLACE FUNCTION public.handle_new_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Make an HTTP POST request to the login-alert Edge Function
  PERFORM net.http_post(
    url := 'https://dssjspakagyerrmtaakm.supabase.co/functions/v1/login-alert',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2pzcGFrYWd5ZXJybXRhYWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MjYzMDgsImV4cCI6MjA2MzMwMjMwOH0.hObNRlCNKw18XZm6xq7dyubSpBSK9I4mHT1W6lGU5ys"}'::jsonb,
    body := jsonb_build_object('record', NEW)
  );
  RETURN NEW;
END;
$$;

-- First, drop any existing trigger to avoid errors
DROP TRIGGER IF EXISTS on_new_login ON auth.users;

-- Create the trigger that fires on login
CREATE TRIGGER on_new_login
  AFTER UPDATE OF last_sign_in_at ON auth.users
  FOR EACH ROW
  WHEN (OLD.last_sign_in_at IS DISTINCT FROM NEW.last_sign_in_at)
  EXECUTE FUNCTION public.handle_new_login();