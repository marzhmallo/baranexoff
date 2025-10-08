-- Create public views with correct column names
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

-- Create public_profiles view with safe fields (no updated_at since it doesn't exist)
CREATE VIEW public_profiles AS
SELECT 
  id,
  firstname,
  lastname,
  email,
  brgyid,
  role,
  created_at
FROM profiles;

-- Grant access to authenticated users
GRANT SELECT ON public_barangays TO authenticated;
GRANT SELECT ON public_profiles TO authenticated;
GRANT SELECT ON public_barangays TO anon;
GRANT SELECT ON public_profiles TO anon;