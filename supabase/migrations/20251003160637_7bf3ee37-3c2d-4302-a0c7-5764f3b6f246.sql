-- Create security definer function to get user's brgyid without recursion
CREATE OR REPLACE FUNCTION public.get_user_brgyid(_user_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT brgyid FROM public.profiles WHERE id = _user_id;
$$;

-- Drop problematic recursive policies
DROP POLICY IF EXISTS "Admins view barangay profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users view barangay profiles" ON public.profiles;

-- Recreate policies using the security definer function
CREATE POLICY "Admins view barangay profiles"
ON public.profiles
FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') 
  AND brgyid = public.get_user_brgyid(auth.uid())
);

CREATE POLICY "Users view barangay profiles"
ON public.profiles
FOR SELECT
USING (
  brgyid = public.get_user_brgyid(auth.uid())
);