-- Enhance notification system schema and triggers

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notification_userid_read ON notification (userid, read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_type ON notification (type);

-- Add archived column for soft deletes
ALTER TABLE notification ADD COLUMN IF NOT EXISTS archived boolean DEFAULT false;

-- Add priority column for notification urgency
ALTER TABLE notification ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- Add category column for better organization
ALTER TABLE notification ADD COLUMN IF NOT EXISTS category text DEFAULT 'general';

-- Update existing triggers to use correct table name and add more comprehensive notifications

-- Enhanced function for resident notifications
CREATE OR REPLACE FUNCTION public.notify_residents_announcement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- Insert notifications for all residents in the barangay
  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    created_at,
    updated_at,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'announcement',
    'New announcement: ' || NEW.title,
    'announcement',
    CASE 
      WHEN NEW.is_pinned = true THEN 'high'
      ELSE 'normal'
    END,
    NOW(),
    NOW(),
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved';
  
  RETURN NEW;
END;
$$;

-- Enhanced function for event notifications
CREATE OR REPLACE FUNCTION public.notify_residents_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    created_at,
    updated_at,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'event',
    'New event: ' || NEW.title || ' on ' || TO_CHAR(NEW.start_time, 'MMM DD, YYYY'),
    'event',
    CASE 
      WHEN NEW.start_time <= NOW() + INTERVAL '24 hours' THEN 'high'
      WHEN NEW.start_time <= NOW() + INTERVAL '7 days' THEN 'normal'
      ELSE 'low'
    END,
    NOW(),
    NOW(),
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved';
  
  RETURN NEW;
END;
$$;

-- Enhanced document update notifications
CREATE OR REPLACE FUNCTION public.notify_document_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
DECLARE
  status_priority text;
BEGIN
  -- Only notify if status changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Set priority based on status
    status_priority := CASE NEW.status
      WHEN 'approved' THEN 'high'
      WHEN 'rejected' THEN 'high'
      WHEN 'ready' THEN 'high'
      ELSE 'normal'
    END;

    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      created_at,
      updated_at,
      read
    ) VALUES (
      NEW.resident_id,
      NEW.id,
      'document_update',
      'Document request ' || NEW.docnumber || ' is now ' || NEW.status,
      'document',
      status_priority,
      NOW(),
      NOW(),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- New function for user approval notifications
CREATE OR REPLACE FUNCTION public.notify_user_status_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- Only notify if status changed to approved or rejected
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notification (
      userid,
      linkurl,
      type,
      message,
      category,
      priority,
      created_at,
      updated_at,
      read
    ) VALUES (
      NEW.id,
      NEW.id,
      'profile_update',
      'Your profile has been ' || NEW.status || ' by the administrator',
      'profile',
      'high',
      NOW(),
      NOW(),
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- New function for emergency notifications
CREATE OR REPLACE FUNCTION public.notify_emergency_alert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  -- Notify all users in the barangay about emergency contacts/alerts
  INSERT INTO notification (
    userid,
    linkurl,
    type,
    message,
    category,
    priority,
    created_at,
    updated_at,
    read
  )
  SELECT 
    p.id,
    NEW.id,
    'emergency_alert',
    'Emergency contact added: ' || NEW.name || ' (' || NEW.type || ')',
    'emergency',
    'urgent',
    NOW(),
    NOW(),
    false
  FROM profiles p
  WHERE p.brgyid = NEW.brgyid
  AND p.status = 'approved';
  
  RETURN NEW;
END;
$$;

-- Create trigger for user status updates
DROP TRIGGER IF EXISTS trigger_notify_user_status ON profiles;
CREATE TRIGGER trigger_notify_user_status
  AFTER UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION notify_user_status_update();

-- Create trigger for emergency contact alerts
DROP TRIGGER IF EXISTS trigger_notify_emergency_alert ON emergency_contacts;
CREATE TRIGGER trigger_notify_emergency_alert
  AFTER INSERT ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION notify_emergency_alert();

-- Function to clean up old notifications (older than 90 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY definer
AS $$
BEGIN
  UPDATE notification 
  SET archived = true 
  WHERE created_at < NOW() - INTERVAL '90 days'
  AND archived = false;
END;
$$;