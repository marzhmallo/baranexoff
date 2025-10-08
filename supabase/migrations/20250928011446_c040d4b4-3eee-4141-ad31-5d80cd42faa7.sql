-- Comprehensive notification system for user profile changes and feedback reports

-- Function to notify admins when a new user joins the barangay
CREATE OR REPLACE FUNCTION notify_new_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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
      p.id,
      NEW.id,
      'user_registration',
      'New user joined: ' || COALESCE(NEW.username, 'Unknown') || ' - ' || 
      COALESCE(NEW.firstname, '') || ' ' || COALESCE(NEW.lastname, ''),
      'user_management',
      'normal',
      false
    FROM profiles p
    WHERE p.brgyid = NEW.brgyid
    AND p.role = 'admin'
    AND p.status = 'approved'
    AND p.id != NEW.id;  -- Exclude the new user themselves
  END IF;
  
  RETURN NEW;
END;
$$;

-- Function to notify users of profile changes (role, status, padlock)
CREATE OR REPLACE FUNCTION notify_profile_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Function to notify admins of new feedback reports
CREATE OR REPLACE FUNCTION notify_new_feedback_report()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    'feedback_new',
    'New ' || NEW.type || ' feedback report: ' || NEW.category || ' - ' || 
    LEFT(NEW.description, 100) || CASE WHEN LENGTH(NEW.description) > 100 THEN '...' ELSE '' END,
    'feedback',
    'normal',
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.role IN ('admin', 'staff')
  AND p.status = 'approved'
  AND p.id != NEW.user_id;  -- Exclude the report submitter
  
  RETURN NEW;
END;
$$;

-- Function to notify users of feedback report status updates
CREATE OR REPLACE FUNCTION notify_feedback_status_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_message TEXT;
  should_notify BOOLEAN := false;
BEGIN
  -- Check if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    notification_message := 'Your feedback report status has been updated to ' || NEW.status;
    should_notify := true;
  -- Check if admin notes were added/updated
  ELSIF OLD.admin_notes IS DISTINCT FROM NEW.admin_notes AND NEW.admin_notes IS NOT NULL THEN
    notification_message := 'Your feedback report has been updated with admin notes';
    should_notify := true;
  END IF;

  -- Send notification if changes warrant it
  IF should_notify THEN
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      read
    ) VALUES (
      NEW.user_id,
      NEW.id,
      'feedback_update',
      notification_message,
      'feedback',
      'high',
      false
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers for profile changes
DROP TRIGGER IF EXISTS trigger_notify_new_user_registration ON profiles;
CREATE TRIGGER trigger_notify_new_user_registration
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_user_registration();

DROP TRIGGER IF EXISTS trigger_notify_profile_changes ON profiles;
CREATE TRIGGER trigger_notify_profile_changes
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_profile_changes();

-- Create triggers for feedback reports
DROP TRIGGER IF EXISTS trigger_notify_new_feedback_report ON feedback_reports;
CREATE TRIGGER trigger_notify_new_feedback_report
  AFTER INSERT ON feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_feedback_report();

DROP TRIGGER IF EXISTS trigger_notify_feedback_status_update ON feedback_reports;
CREATE TRIGGER trigger_notify_feedback_status_update
  AFTER UPDATE ON feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_feedback_status_update();