-- Create public RPC function to search barangays (bypasses RLS for sign-up)
CREATE OR REPLACE FUNCTION public.search_barangays_public(search_query text DEFAULT '')
RETURNS TABLE(
  id uuid,
  barangayname text,
  municipality text,
  province text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.barangayname,
    b.municipality,
    b.province
  FROM public.barangays b
  WHERE 
    search_query = '' 
    OR b.barangayname ILIKE '%' || search_query || '%'
    OR b.municipality ILIKE '%' || search_query || '%'
    OR b.province ILIKE '%' || search_query || '%'
  ORDER BY b.province, b.municipality, b.barangayname
  LIMIT 50;
END;
$$;