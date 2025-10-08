-- Create trigger to call login-alert function when sign-in activity is logged
CREATE OR REPLACE FUNCTION public.trigger_login_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Only trigger for sign-in activities
  IF NEW.action = 'user_sign_in' THEN
    -- Make an HTTP POST request to the login-alert Edge Function
    PERFORM net.http_post(
      url := 'https://dssjspakagyerrmtaakm.supabase.co/functions/v1/login-alert',
      headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzc2pzcGFrYWd5ZXJybXRhYWttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc3MjYzMDgsImV4cCI6MjA2MzMwMjMwOH0.hObNRlCNKw18XZm6xq7dyubSpBSK9I4mHT1W6lGU5ys"}'::jsonb,
      body := jsonb_build_object(
        'user_id', NEW.user_id,
        'ip_address', NEW.ip,
        'user_agent', NEW.agent,
        'timestamp', NEW.created_at,
        'details', NEW.details
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Create the trigger on activity_logs table
DROP TRIGGER IF EXISTS activity_logs_login_alert ON public.activity_logs;
CREATE TRIGGER activity_logs_login_alert
  AFTER INSERT ON public.activity_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_login_alert();