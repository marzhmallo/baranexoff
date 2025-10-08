
-- Add a new setting for auto-filling address fields
INSERT INTO public.settings (key, value, description) 
VALUES (
  'auto_fill_address_from_admin_barangay', 
  'false', 
  'Automatically fill address fields based on admin''s barangay when adding/editing residents and households'
) ON CONFLICT (key) DO NOTHING;
