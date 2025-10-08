-- 1. Function to automatically insert role into user_roles table when profile is created
CREATE OR REPLACE FUNCTION public.handle_profile_role_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert the role into user_roles table when a new profile is created
  IF NEW.role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role, assigned_at)
    VALUES (NEW.id, NEW.role::app_role, NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Create trigger on profiles table
DROP TRIGGER IF EXISTS trigger_sync_profile_role_to_user_roles ON public.profiles;
CREATE TRIGGER trigger_sync_profile_role_to_user_roles
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_profile_role_insert();

-- 3. Update handle_new_user() function to insert into user_roles directly
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  new_role text;
BEGIN
  -- Get the role from metadata
  new_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'user');
  
  -- Insert into profiles (keeping role column for backward compatibility)
  INSERT INTO public.profiles (
    id, username, email, firstname, middlename, lastname, 
    suffix, phone, gender, purok, bday, brgyid, role, status, superior_admin
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.raw_user_meta_data ->> 'firstname',
    NULLIF(NEW.raw_user_meta_data ->> 'middlename', ''),
    NEW.raw_user_meta_data ->> 'lastname',
    NULLIF(NEW.raw_user_meta_data ->> 'suffix', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'gender', 'Female'),
    NEW.raw_user_meta_data ->> 'purok',
    (NEW.raw_user_meta_data ->> 'bday')::date,
    NULLIF(NEW.raw_user_meta_data ->> 'brgyid', '')::uuid,
    new_role,
    COALESCE(NEW.raw_user_meta_data ->> 'status', 'Pending'),
    COALESCE((NEW.raw_user_meta_data ->> 'superior_admin')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Also insert into user_roles table
  INSERT INTO public.user_roles (user_id, role, assigned_at)
  VALUES (NEW.id, new_role::public.app_role, NOW())
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 4. Backfill existing users who don't have entries in user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role::app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL
  AND role IN ('admin', 'staff', 'user', 'glyph', 'overseer')
  AND id NOT IN (SELECT user_id FROM public.user_roles)
ON CONFLICT (user_id, role) DO NOTHING;