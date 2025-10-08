-- Update public views to ensure they exist and have proper structure
DROP VIEW IF EXISTS public_barangays;
DROP VIEW IF EXISTS public_profiles;

-- Create public_barangays view with all necessary fields
CREATE VIEW public_barangays AS
SELECT 
  id,
  barangayname,
  municipality,
  province,
  region,
  country,
  created_at,
  is_custom,
  logo_url,
  email,
  phone,
  officehours,
  instructions,
  backgroundurl,
  gcashurl,
  gcashname,
  halllat,
  halllong
FROM barangays;

-- Create public_profiles view with safe fields
CREATE VIEW public_profiles AS
SELECT 
  id,
  firstname,
  lastname,
  email,
  brgyid,
  role,
  created_at,
  updated_at
FROM profiles;

-- Enable RLS on views (inherited from base tables)
ALTER VIEW public_barangays SET (security_barrier = true);
ALTER VIEW public_profiles SET (security_barrier = true);

-- Grant access to authenticated users
GRANT SELECT ON public_barangays TO authenticated;
GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_barangays TO anon;
GRANT SELECT ON public_profiles TO anon;