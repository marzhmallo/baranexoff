-- Create security definer function to get admin IDs for a barangay (bypasses RLS)
CREATE OR REPLACE FUNCTION public.get_barangay_admins(_brgyid uuid)
RETURNS TABLE(admin_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.profiles
  WHERE brgyid = _brgyid
    AND role = 'admin'
    AND status = 'approved';
$$;

-- Update notify_new_user_registration to use the security definer function
CREATE OR REPLACE FUNCTION public.notify_new_user_registration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if this is a new user registration (has brgyid)
  IF NEW.brgyid IS NOT NULL THEN
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
      admin_id,
      NEW.id,
      'user_registration',
      'New user joined: ' || COALESCE(NEW.username, 'Unknown') || ' - ' || 
      COALESCE(NEW.firstname, '') || ' ' || COALESCE(NEW.lastname, ''),
      'user_management',
      'normal',
      false
    FROM public.get_barangay_admins(NEW.brgyid)
    WHERE admin_id != NEW.id;  -- Exclude the new user themselves
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update notify_profile_changes to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.notify_profile_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  notification_message TEXT;
  notification_type TEXT;
  notification_priority TEXT;
BEGIN
  -- Role change notification
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    notification_message := 'Your role has been changed to ' || NEW.role || ' by an administrator';
    notification_type := 'role_change';
    notification_priority := 'high';
    
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      read
    ) VALUES (
      NEW.id,
      NEW.id,
      notification_type,
      notification_message,
      'user_management',
      notification_priority,
      false
    );
  END IF;

  -- Status change notification
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    notification_message := 'Your account status has been updated to ' || NEW.status;
    notification_type := 'status_change';
    notification_priority := 'high';
    
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      read
    ) VALUES (
      NEW.id,
      NEW.id,
      notification_type,
      notification_message,
      'user_management',
      notification_priority,
      false
    );
  END IF;

  -- Account lock/unlock notification
  IF OLD.padlock IS DISTINCT FROM NEW.padlock THEN
    notification_message := CASE 
      WHEN NEW.padlock = true THEN 'Your account has been locked by an administrator'
      ELSE 'Your account has been unlocked by an administrator'
    END;
    notification_type := 'account_security';
    notification_priority := 'urgent';
    
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      read
    ) VALUES (
      NEW.id,
      NEW.id,
      notification_type,
      notification_message,
      'user_management',
      notification_priority,
      false
    );
  END IF;

  RETURN NEW;
END;
$$;