-- Fix the get_user_sessions function to properly cast aal enum to text
CREATE OR REPLACE FUNCTION public.get_user_sessions()
RETURNS TABLE(
  id uuid, 
  user_id uuid, 
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  factor_id uuid, 
  aal text, 
  not_after timestamp with time zone, 
  user_agent text, 
  ip text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'auth'
AS $function$
BEGIN
  RETURN QUERY 
  SELECT 
    s.id,
    s.user_id,
    s.created_at,
    s.updated_at,
    s.factor_id,
    s.aal::text,  -- Cast aal_level enum to text
    s.not_after,
    s.user_agent,
    s.ip::text
  FROM auth.sessions s
  WHERE s.user_id = auth.uid()
  ORDER BY s.created_at DESC;
END;
$function$;