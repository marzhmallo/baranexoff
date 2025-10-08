-- Create or replace trigger to create profiles after auth.users is created
-- Ensure we don't duplicate triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    firstname,
    middlename,
    lastname,
    suffix,
    phone,
    gender,
    purok,
    bday,
    brgyid,
    role,
    status,
    superior_admin
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
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'user'),
    COALESCE(NEW.raw_user_meta_data ->> 'status', 'Pending'),
    COALESCE((NEW.raw_user_meta_data ->> 'superior_admin')::boolean, false)
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Create trigger to call the function after a new auth user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
