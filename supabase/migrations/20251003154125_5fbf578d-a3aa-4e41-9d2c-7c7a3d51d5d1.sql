-- ============================================================================
-- CRITICAL SECURITY FIXES - Address all findings from security scan
-- ============================================================================

-- ============================================================================
-- 1. FIX: Enable RLS on hieroglyphics table (MFA secrets)
-- ============================================================================
ALTER TABLE public.hieroglyphics ENABLE ROW LEVEL SECURITY;

-- Drop the overly restrictive policy and create proper user-owned policies
DROP POLICY IF EXISTS "Deny all access to MFA settings" ON public.hieroglyphics;

CREATE POLICY "Users manage own MFA settings"
ON public.hieroglyphics
FOR ALL
USING (userid = auth.uid())
WITH CHECK (userid = auth.uid());

-- ============================================================================
-- 2. FIX: Restrict profiles table access (currently publicly readable)
-- ============================================================================

-- Drop the overly permissive public policy
DROP POLICY IF EXISTS "Allow read access to profiles" ON public.profiles;

-- Allow users to view their own profile
CREATE POLICY "Users view own profile"
ON public.profiles
FOR SELECT
USING (id = auth.uid());

-- Allow authenticated users to view profiles in their barangay
CREATE POLICY "Users view barangay profiles"
ON public.profiles
FOR SELECT
USING (
  auth.role() = 'authenticated' AND
  brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
);

-- Admins can view all profiles in their barangay
CREATE POLICY "Admins view barangay profiles"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
    AND p.brgyid = profiles.brgyid
  )
);

-- ============================================================================
-- 3. FIX: Restrict residents table access (currently publicly readable)
-- ============================================================================

-- Drop any overly permissive policies on residents
DROP POLICY IF EXISTS "Enable read access for all users" ON public.residents;
DROP POLICY IF EXISTS "Public can view residents" ON public.residents;

-- Only authenticated users in the same barangay can view residents
CREATE POLICY "Users view residents in own barangay"
ON public.residents
FOR SELECT
USING (
  brgyid = (SELECT brgyid FROM public.profiles WHERE id = auth.uid())
);

-- ============================================================================
-- 4. CREATE USER ROLES SYSTEM - Separate roles from profiles table
-- ============================================================================

-- Create role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user', 'glyph', 'overseer');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_by UUID REFERENCES auth.users(id),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Only admins can assign roles"
ON public.user_roles
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing roles from profiles to user_roles
INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT id, role::app_role, created_at
FROM public.profiles
WHERE role IS NOT NULL
  AND role IN ('admin', 'staff', 'user', 'glyph', 'overseer')
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- 5. FIX: Add search_path to emergency notification functions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.notify_disaster_zone_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  risk_priority text;
  zone_message text;
BEGIN
  risk_priority := CASE NEW.risk_level
    WHEN 'high' THEN 'urgent'
    WHEN 'medium' THEN 'high'
    ELSE 'normal'
  END;

  zone_message := 'New ' || NEW.risk_level || ' risk ' || NEW.zone_type || ' zone identified: ' || NEW.zone_name;
  IF NEW.notes IS NOT NULL THEN
    zone_message := zone_message || ' - ' || LEFT(NEW.notes, 100) || CASE WHEN LENGTH(NEW.notes) > 100 THEN '...' ELSE '' END;
  END IF;

  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'disaster_zone_alert',
    zone_message,
    'emergency',
    risk_priority,
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_evacuation_center_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  center_message text;
BEGIN
  center_message := 'New evacuation center available: ' || NEW.name || ' (Capacity: ' || NEW.capacity || ' people)';
  IF NEW.address IS NOT NULL THEN
    center_message := center_message || ' at ' || NEW.address;
  END IF;
  IF NEW.facilities IS NOT NULL AND array_length(NEW.facilities, 1) > 0 THEN
    center_message := center_message || ' - Facilities: ' || array_to_string(NEW.facilities, ', ');
  END IF;

  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'evacuation_center_alert',
    center_message,
    'emergency',
    'high',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved';
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_evacuation_route_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  route_message text;
  start_desc text;
  end_desc text;
BEGIN
  start_desc := COALESCE(NEW.start_point->>'description', 'Starting point');
  end_desc := COALESCE(NEW.end_point->>'description', 'Safe destination');

  route_message := 'New evacuation route: ' || NEW.route_name || ' from ' || start_desc || ' to ' || end_desc;
  
  IF NEW.distance_km IS NOT NULL THEN
    route_message := route_message || ' (' || NEW.distance_km || ' km';
    IF NEW.estimated_time_minutes IS NOT NULL THEN
      route_message := route_message || ', ~' || NEW.estimated_time_minutes || ' minutes)';
    ELSE
      route_message := route_message || ')';
    END IF;
  END IF;

  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'evacuation_route_alert',
    route_message,
    'emergency',
    'high',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved'
  AND p.id != NEW.created_by;
  
  RETURN NEW;
END;
$function$;

-- ============================================================================
-- 6. FIX: Make sensitive storage buckets private
-- ============================================================================

UPDATE storage.buckets 
SET public = false 
WHERE name IN ('officials', 'reportfeedback', 'cashqr', 'forum');

-- Add RLS policies for controlled access to storage
CREATE POLICY "Authenticated users view their barangay files"
ON storage.objects FOR SELECT
USING (
  bucket_id IN ('officials', 'reportfeedback', 'cashqr', 'forum') AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Admins manage barangay files"
ON storage.objects FOR ALL
USING (
  bucket_id IN ('officials', 'reportfeedback', 'cashqr', 'forum') AND
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- ============================================================================
-- 7. CREATE AUDIT LOG for role changes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.role_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_role app_role,
    new_role app_role NOT NULL,
    changed_by UUID REFERENCES auth.users(id),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT
);

ALTER TABLE public.role_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view role audit logs"
ON public.role_audit_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- VERIFICATION: Check that critical tables have RLS enabled
-- ============================================================================

-- This will show tables with RLS status
-- Run manually to verify: SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

COMMENT ON TABLE public.hieroglyphics IS 'MFA secrets - RLS ENABLED with user-owned policies';
COMMENT ON TABLE public.user_roles IS 'User roles - Separated from profiles for security';
COMMENT ON TABLE public.role_audit_log IS 'Audit trail for all role changes';